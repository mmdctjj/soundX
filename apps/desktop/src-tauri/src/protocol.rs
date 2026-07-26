use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use percent_encoding::percent_decode_str;
use tauri::http::{Request, Response, StatusCode};
use tauri::{Manager, Runtime, UriSchemeContext};

use crate::cache::expand_tilde;
use crate::commands::AppState;

/// Serves `media://` requests.
///
/// This is the Tauri replacement for the legacy Electron
/// `protocol.handle('media', ...)` registration:
/// - `media://audio/<rel>`   -> `<downloadPath>/<rel>` (downloaded audio file)
/// - `media://cover/<file>`  -> `<cacheDir>/<file>`    (cover thumbnail)
/// - `media://metadata/<file>` -> `<cacheDir>/<file>`
///
/// Range requests are honoured so the `<audio>` element can stream and seek.
pub fn handle_media<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let app = ctx.app_handle();
    let state = app.state::<AppState>();
    let download_path = state
        .download_path
        .lock()
        .map(|s| s.clone())
        .unwrap_or_default();
    let cache_dir = state.cache_manager.cache_dir().to_path_buf();

    let uri = request.uri();
    let host = uri.host().unwrap_or("");
    let path = uri.path().trim_start_matches('/');

    // The URI shape differs by platform, so normalise to (kind, rel):
    //   macOS/Linux as-is : media://audio/<p>            -> host = "audio"
    //   macOS normalised  : media://localhost/audio/<p>  -> host = "localhost"
    //   Windows           : http://media.localhost/audio/<p> -> host = "media.localhost"
    let (kind, rel) = match host {
        "audio" | "cover" | "metadata" => (host.to_string(), path.to_string()),
        _ => match path.find('/') {
            Some(i) => (path[..i].to_string(), path[i + 1..].to_string()),
            None => (path.to_string(), String::new()),
        },
    };

    let decoded = percent_decode_str(&rel).decode_utf8_lossy().to_string();

    let file_path: PathBuf = match kind.as_str() {
        "audio" => {
            let base = expand_tilde(&download_path).unwrap_or_else(|_| download_path.clone());
            PathBuf::from(base).join(&decoded)
        }
        "cover" | "metadata" => cache_dir.join(&decoded),
        // Legacy bare-host form, e.g. `media://10604_cover.jpeg`
        other => cache_dir.join(other),
    };

    let range = request.headers().get("range").and_then(|v| v.to_str().ok());
    serve_file(&file_path, range)
}

fn serve_file(file_path: &Path, range: Option<&str>) -> Response<Vec<u8>> {
    let metadata = match std::fs::metadata(file_path) {
        Ok(m) => m,
        Err(_) => return build_response(StatusCode::NOT_FOUND, None, Vec::new(), None),
    };
    if !metadata.is_file() {
        return build_response(StatusCode::NOT_FOUND, None, Vec::new(), None);
    }
    let total = metadata.len();
    let mime = mime_for(file_path);

    if let Some(span) = range.and_then(|r| parse_range(r, total)) {
        let body = read_range(file_path, span.start, span.length);
        let content_range = format!("bytes {}-{}/{}", span.start, span.start + span.length - 1, total);
        return build_response(StatusCode::PARTIAL_CONTENT, Some(mime), body, Some(content_range));
    }

    let body = std::fs::read(file_path).unwrap_or_default();
    build_response(StatusCode::OK, Some(mime), body, None)
}

pub(crate) struct ByteSpan {
    pub(crate) start: u64,
    pub(crate) length: u64,
}

/// Parses a single-range `bytes=START-END` header (END optional).
pub(crate) fn parse_range(header: &str, total: u64) -> Option<ByteSpan> {
    let spec = header.strip_prefix("bytes=")?;
    let mut parts = spec.splitn(2, '-');
    let start_str = parts.next()?;
    let end_str = parts.next().unwrap_or("");
    let start: u64 = start_str.parse().ok()?;
    let end: u64 = if end_str.is_empty() {
        total.saturating_sub(1)
    } else {
        end_str.parse().ok()?
    };
    if start > end || start >= total {
        return None;
    }
    let end = end.min(total - 1);
    Some(ByteSpan {
        start,
        length: end - start + 1,
    })
}

fn read_range(path: &Path, start: u64, length: u64) -> Vec<u8> {
    let mut file = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    if file.seek(SeekFrom::Start(start)).is_err() {
        return Vec::new();
    }
    let mut buf = vec![0u8; length as usize];
    let mut filled = 0;
    while filled < buf.len() {
        match file.read(&mut buf[filled..]) {
            Ok(0) => break,
            Ok(n) => filled += n,
            Err(_) => break,
        }
    }
    buf.truncate(filled);
    buf
}

fn build_response(
    status: StatusCode,
    mime: Option<&str>,
    body: Vec<u8>,
    content_range: Option<String>,
) -> Response<Vec<u8>> {
    let mut builder = Response::builder()
        .status(status)
        .header("Access-Control-Allow-Origin", "*")
        .header("Accept-Ranges", "bytes");
    if let Some(m) = mime {
        builder = builder.header("Content-Type", m);
    }
    if let Some(cr) = content_range {
        builder = builder.header("Content-Range", cr);
    }
    builder = builder.header("Content-Length", body.len().to_string());
    builder.body(body).unwrap_or_else(|_| Response::new(Vec::new()))
}

pub(crate) fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("mp3") => "audio/mpeg",
        Some("flac") => "audio/flac",
        Some("wav") => "audio/wav",
        Some("aac") => "audio/aac",
        Some("m4a") | Some("mp4") => "audio/mp4",
        Some("ogg") | Some("opus") => "audio/ogg",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("json") => "application/json",
        _ => "application/octet-stream",
    }
}
