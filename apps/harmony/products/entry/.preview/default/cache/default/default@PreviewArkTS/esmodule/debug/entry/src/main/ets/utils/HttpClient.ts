import http from "@ohos:net.http";
class HttpClient {
    private baseURL: string = 'http://localhost:3000';
    private token: string = '';
    setBaseURL(url: string): void {
        this.baseURL = url.replace(/\/+$/, '');
    }
    getBaseURL(): string {
        return this.baseURL;
    }
    setToken(token: string): void {
        this.token = token;
    }
    async request(method: string, url: string, data?: Record<string, Object>, headers?: Record<string, string>): Promise<Object> {
        const httpRequest = http.createHttp();
        const fullURL = url.startsWith('http') ? url : this.baseURL + url;
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (headers) {
            const keys = Object.keys(headers);
            for (let i = 0; i < keys.length; i++) {
                requestHeaders[keys[i]] = headers[keys[i]];
            }
        }
        if (this.token) {
            requestHeaders['Authorization'] = 'Bearer ' + this.token;
        }
        let extraData: string | undefined = undefined;
        if (data) {
            extraData = JSON.stringify(data);
        }
        // 打印请求信息
        console.info(`[HTTP Request] ${method} ${fullURL}`);
        console.info(`[HTTP Headers] ${JSON.stringify(requestHeaders)}`);
        if (extraData) {
            console.info(`[HTTP Body] ${extraData}`);
        }
        let response: http.HttpResponse;
        try {
            response = await new Promise<http.HttpResponse>((resolve, reject) => {
                httpRequest.request(fullURL, {
                    method: method as http.RequestMethod,
                    header: requestHeaders,
                    extraData: extraData,
                    readTimeout: 30000,
                    connectTimeout: 10000
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        }
        catch (error) {
            httpRequest.destroy();
            console.error(`[HTTP Error] ${method} ${fullURL}: ${error}`);
            throw new Error(String(error));
        }
        httpRequest.destroy();
        // 打印响应信息
        console.info(`[HTTP Response] ${method} ${fullURL} - Status: ${response.responseCode}`);
        console.info(`[HTTP Response Body] ${response.result}`);
        if (response.responseCode >= 200 && response.responseCode < 300) {
            const result = response.result as string;
            if (result) {
                return JSON.parse(result) as Object;
            }
            return new Object();
        }
        else {
            throw new Error('HTTP ' + response.responseCode + ': ' + response.result);
        }
    }
    async get(url: string, headers?: Record<string, string>): Promise<Object> {
        return this.request('GET', url, undefined, headers);
    }
    async post(url: string, data?: Record<string, Object>, headers?: Record<string, string>): Promise<Object> {
        return this.request('POST', url, data, headers);
    }
    async put(url: string, data?: Record<string, Object>, headers?: Record<string, string>): Promise<Object> {
        return this.request('PUT', url, data, headers);
    }
    async delete(url: string, headers?: Record<string, string>): Promise<Object> {
        return this.request('DELETE', url, undefined, headers);
    }
}
export const httpClient = new HttpClient();
