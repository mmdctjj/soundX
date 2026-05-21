if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface HomePage_Params {
    sections?: Section[];
    loading?: boolean;
    refreshing?: boolean;
    mode?: string;
    isRadioMode?: boolean;
    userId?: string;
}
import { httpClient } from "@bundle:com.audiodock.harmony/entry/ets/utils/HttpClient";
import { storage } from "@bundle:com.audiodock.harmony/entry/ets/utils/StorageManager";
import { getLatestArtists, getRecentAlbums, getRecommendedAlbums, getLatestTracks, getAlbumHistory, toggleTrackLike, toggleTrackUnLike, TrackImpl } from "@bundle:com.audiodock.harmony/entry/ets/utils/ApiService";
import type { Artist, Album, Track, LikeUser } from "@bundle:com.audiodock.harmony/entry/ets/utils/ApiService";
class Section {
    id: string = '';
    title: string = '';
    type: string = '';
    data: Artist[] | Album[] | Track[] = [];
    constructor(id: string, title: string, type: string, data: Artist[] | Album[] | Track[]) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.data = data;
    }
}
class HomePage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__sections = new ObservedPropertyObjectPU([], this, "sections");
        this.__loading = new ObservedPropertySimplePU(true, this, "loading");
        this.__refreshing = new ObservedPropertySimplePU(false, this, "refreshing");
        this.__mode = new ObservedPropertySimplePU('MUSIC', this, "mode");
        this.__isRadioMode = new ObservedPropertySimplePU(false, this, "isRadioMode");
        this.__userId = new ObservedPropertySimplePU('', this, "userId");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: HomePage_Params) {
        if (params.sections !== undefined) {
            this.sections = params.sections;
        }
        if (params.loading !== undefined) {
            this.loading = params.loading;
        }
        if (params.refreshing !== undefined) {
            this.refreshing = params.refreshing;
        }
        if (params.mode !== undefined) {
            this.mode = params.mode;
        }
        if (params.isRadioMode !== undefined) {
            this.isRadioMode = params.isRadioMode;
        }
        if (params.userId !== undefined) {
            this.userId = params.userId;
        }
    }
    updateStateVars(params: HomePage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__sections.purgeDependencyOnElmtId(rmElmtId);
        this.__loading.purgeDependencyOnElmtId(rmElmtId);
        this.__refreshing.purgeDependencyOnElmtId(rmElmtId);
        this.__mode.purgeDependencyOnElmtId(rmElmtId);
        this.__isRadioMode.purgeDependencyOnElmtId(rmElmtId);
        this.__userId.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__sections.aboutToBeDeleted();
        this.__loading.aboutToBeDeleted();
        this.__refreshing.aboutToBeDeleted();
        this.__mode.aboutToBeDeleted();
        this.__isRadioMode.aboutToBeDeleted();
        this.__userId.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __sections: ObservedPropertyObjectPU<Section[]>;
    get sections() {
        return this.__sections.get();
    }
    set sections(newValue: Section[]) {
        this.__sections.set(newValue);
    }
    private __loading: ObservedPropertySimplePU<boolean>;
    get loading() {
        return this.__loading.get();
    }
    set loading(newValue: boolean) {
        this.__loading.set(newValue);
    }
    private __refreshing: ObservedPropertySimplePU<boolean>;
    get refreshing() {
        return this.__refreshing.get();
    }
    set refreshing(newValue: boolean) {
        this.__refreshing.set(newValue);
    }
    private __mode: ObservedPropertySimplePU<string>;
    get mode() {
        return this.__mode.get();
    }
    set mode(newValue: string) {
        this.__mode.set(newValue);
    }
    private __isRadioMode: ObservedPropertySimplePU<boolean>;
    get isRadioMode() {
        return this.__isRadioMode.get();
    }
    set isRadioMode(newValue: boolean) {
        this.__isRadioMode.set(newValue);
    }
    private __userId: ObservedPropertySimplePU<string>;
    get userId() {
        return this.__userId.get();
    }
    set userId(newValue: string) {
        this.__userId.set(newValue);
    }
    aboutToAppear() {
        this.initData();
    }
    async initData() {
        try {
            const savedAddress = await storage.getItem('serverAddress');
            const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;
            const savedUser = await storage.getItem('currentUser');
            if (savedAddress) {
                httpClient.setBaseURL(savedAddress);
            }
            if (savedToken) {
                httpClient.setToken(savedToken);
            }
            if (savedUser) {
                const user = JSON.parse(savedUser) as Record<string, Object>;
                this.userId = String(user['id'] || '');
            }
            const savedMode = await storage.getItem('playMode');
            if (savedMode) {
                this.mode = savedMode;
            }
        }
        catch (e) {
            console.error('Failed to init data:', e);
        }
        this.loadData();
    }
    async loadData() {
        if (!this.refreshing) {
            this.loading = true;
        }
        try {
            const pageSize = 8;
            const promises: Promise<Object>[] = [
                getLatestArtists(this.mode, true, pageSize),
                getRecentAlbums(this.mode, true, pageSize),
                getRecommendedAlbums(this.mode, true, pageSize)
            ];
            if (this.mode === 'MUSIC') {
                promises.push(getLatestTracks('MUSIC', true, pageSize));
            }
            if (this.mode === 'AUDIOBOOK' && this.userId.length > 0) {
                promises.push(getAlbumHistory(this.userId, 0, pageSize, 'AUDIOBOOK'));
            }
            const results = await Promise.all(promises);
            const artistsRes = results[0] as Record<string, Object>;
            const recentRes = results[1] as Record<string, Object>;
            const recommendedRes = results[2] as Record<string, Object>;
            const tracksRes = this.mode === 'MUSIC' ? results[3] as Record<string, Object> : null;
            const historyRes = this.mode === 'AUDIOBOOK' && this.userId.length > 0 ? results[3] as Record<string, Object> : null;
            const sections: Section[] = [];
            if (artistsRes['code'] === 200 && artistsRes['data']) {
                sections.push(new Section('artists', '最新艺人', 'artist', artistsRes['data'] as Artist[]));
            }
            if (recentRes['code'] === 200 && recentRes['data']) {
                sections.push(new Section('recent', '最新专辑', 'album', recentRes['data'] as Album[]));
            }
            if (recommendedRes['code'] === 200 && recommendedRes['data']) {
                sections.push(new Section('recommended', '推荐专辑', 'album', recommendedRes['data'] as Album[]));
            }
            if (this.mode === 'MUSIC' && tracksRes && tracksRes['code'] === 200 && tracksRes['data']) {
                sections.push(new Section('tracks', '最新曲目', 'track', tracksRes['data'] as Track[]));
            }
            if (this.mode === 'AUDIOBOOK' && historyRes && historyRes['code'] === 200) {
                const historyDataObj = historyRes['data'] as Record<string, Object>;
                const list = historyDataObj['list'] as Array<Record<string, Object>>;
                if (list && list.length > 0) {
                    const historyAlbums: Album[] = [];
                    for (let i = 0; i < list.length; i++) {
                        const item = list[i];
                        const album = item['album'] as Album;
                        historyAlbums.push(album);
                    }
                    sections.push(new Section('history', '继续听', 'album', historyAlbums));
                }
            }
            this.sections = sections;
        }
        catch (error) {
            console.error('Failed to load home data:', error);
        }
        finally {
            this.loading = false;
            this.refreshing = false;
        }
    }
    onRefresh() {
        this.refreshing = true;
        this.loadData();
    }
    toggleMode() {
        this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
        storage.setItem('playMode', this.mode);
        this.loading = true;
        this.loadData();
    }
    toggleRadioMode() {
        this.isRadioMode = !this.isRadioMode;
    }
    async toggleLike(trackId: number | string) {
        if (!this.userId || this.userId.length === 0) {
            return;
        }
        for (let i = 0; i < this.sections.length; i++) {
            const section = this.sections[i];
            if (section.type === 'track') {
                const tracks = section.data as Track[];
                for (let j = 0; j < tracks.length; j++) {
                    const track = tracks[j];
                    if (track.id === trackId) {
                        let isLiked = false;
                        if (track.likedByUsers && track.likedByUsers.length > 0) {
                            for (let k = 0; k < track.likedByUsers.length; k++) {
                                if (String(track.likedByUsers[k].userId) === this.userId) {
                                    isLiked = true;
                                    break;
                                }
                            }
                        }
                        try {
                            if (isLiked) {
                                await toggleTrackUnLike(trackId, this.userId);
                            }
                            else {
                                await toggleTrackLike(trackId, this.userId);
                            }
                            this.updateTrackLikeStatus(trackId, !isLiked);
                        }
                        catch (e) {
                            console.error('Failed to toggle like:', e);
                        }
                        return;
                    }
                }
            }
        }
    }
    updateTrackLikeStatus(trackId: number | string, liked: boolean) {
        const newSections: Section[] = [];
        for (let i = 0; i < this.sections.length; i++) {
            const section = this.sections[i];
            if (section.type === 'track') {
                const newData: Track[] = [];
                for (let j = 0; j < section.data.length; j++) {
                    const t = section.data[j] as Track;
                    if (t.id === trackId) {
                        let newLikedByUsers: Array<LikeUser>;
                        const likedUser: LikeUser = { userId: this.userId };
                        if (liked) {
                            newLikedByUsers = [...(t.likedByUsers || []), likedUser];
                        }
                        else {
                            newLikedByUsers = [];
                            const users = t.likedByUsers || [];
                            for (let k = 0; k < users.length; k++) {
                                if (String(users[k].userId) !== this.userId) {
                                    newLikedByUsers.push(users[k]);
                                }
                            }
                        }
                        const newTrack = new TrackImpl();
                        newTrack.id = t.id;
                        newTrack.name = t.name;
                        newTrack.artist = t.artist;
                        newTrack.cover = t.cover;
                        newTrack.album = t.album;
                        newTrack.liked = liked;
                        newTrack.likedByUsers = newLikedByUsers;
                        newData.push(newTrack);
                    }
                    else {
                        newData.push(t);
                    }
                }
                newSections.push(new Section(section.id, section.title, section.type, newData));
            }
            else {
                newSections.push(new Section(section.id, section.title, section.type, section.data));
            }
        }
        this.sections = newSections;
    }
    isTrackLiked(track: Track): boolean {
        if (!track.likedByUsers || track.likedByUsers.length === 0) {
            return false;
        }
        for (let i = 0; i < track.likedByUsers.length; i++) {
            if (String(track.likedByUsers[i].userId) === this.userId) {
                return true;
            }
        }
        return false;
    }
    navigateToSearch() {
        // TODO: Implement search page
    }
    navigateToArtist(artistId: number | string) {
        // TODO: Implement artist detail page
    }
    navigateToAlbum(albumId: number | string) {
        // TODO: Implement album detail page
    }
    playTrack(track: Track) {
        // TODO: Implement player
    }
    async refreshSection(sectionId: string) {
        try {
            const pageSize = 8;
            let newData: Object[] = [];
            if (sectionId === 'artists') {
                const res = await getLatestArtists(this.mode, true, pageSize) as Record<string, Object>;
                if (res['code'] === 200) {
                    newData = res['data'] as Object[];
                }
            }
            else if (sectionId === 'recent') {
                const res = await getRecentAlbums(this.mode, true, pageSize) as Record<string, Object>;
                if (res['code'] === 200) {
                    newData = res['data'] as Object[];
                }
            }
            else if (sectionId === 'recommended') {
                const res = await getRecommendedAlbums(this.mode, true, pageSize) as Record<string, Object>;
                if (res['code'] === 200) {
                    newData = res['data'] as Object[];
                }
            }
            else if (sectionId === 'tracks') {
                const res = await getLatestTracks('MUSIC', true, pageSize) as Record<string, Object>;
                if (res['code'] === 200) {
                    newData = res['data'] as Object[];
                }
            }
            else if (sectionId === 'history' && this.userId.length > 0) {
                const res = await getAlbumHistory(this.userId, 0, pageSize, 'AUDIOBOOK') as Record<string, Object>;
                if (res['code'] === 200) {
                    const data = res['data'] as Record<string, Object>;
                    const list = data['list'] as Array<Record<string, Object>>;
                    if (list) {
                        for (let i = 0; i < list.length; i++) {
                            const album = list[i]['album'] as Object;
                            newData.push(album);
                        }
                    }
                }
            }
            if (newData.length > 0) {
                const newSections: Section[] = [];
                for (let i = 0; i < this.sections.length; i++) {
                    const section = this.sections[i];
                    if (section.id === sectionId) {
                        const typedData = newData as Artist[] | Album[] | Track[];
                        newSections.push(new Section(section.id, section.title, section.type, typedData));
                    }
                    else {
                        newSections.push(new Section(section.id, section.title, section.type, section.data));
                    }
                }
                this.sections = newSections;
            }
        }
        catch (error) {
            console.error('Failed to refresh section:', error);
        }
    }
    ArtistCard(artist: Artist, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(329:5)", "entry");
            Column.margin({ right: 16 });
            Column.onClick(() => this.navigateToArtist(artist.id));
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(330:7)", "entry");
            Column.width(80);
            Column.height(80);
            Column.borderRadius(40);
            Column.backgroundColor('#007DFF');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(artist.name.substring(0, 1));
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(331:9)", "entry");
            Text.fontSize(30);
            Text.fontColor('#FFFFFF');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(artist.name);
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(342:7)", "entry");
            Text.fontSize(13);
            Text.fontColor('#2c3e50');
            Text.margin({ top: 8 });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.textAlign(TextAlign.Center);
            Text.width(80);
        }, Text);
        Text.pop();
        Column.pop();
    }
    AlbumCard(album: Album, showProgress: boolean, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(357:5)", "entry");
            Column.margin({ right: 16 });
            Column.onClick(() => this.navigateToAlbum(album.id));
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(358:7)", "entry");
            Column.width(120);
            Column.height(120);
            Column.borderRadius(10);
            Column.backgroundColor('#5B8FF9');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(album.name.substring(0, 1));
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(359:9)", "entry");
            Text.fontSize(40);
            Text.fontColor('#FFFFFF');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (showProgress && album.progress !== undefined && album.progress > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Stack.create();
                        Stack.debugLine("products/entry/src/main/ets/pages/HomePage.ets(371:9)", "entry");
                        Stack.width(120);
                        Stack.margin({ top: -8, bottom: 8 });
                        Stack.align(Alignment.Bottom);
                    }, Stack);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(372:11)", "entry");
                        Row.width('100%');
                        Row.height(3);
                        Row.backgroundColor('rgba(255,255,255,0.3)');
                        Row.borderRadius(1.5);
                    }, Row);
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(378:11)", "entry");
                        Row.width(album.progress + '%');
                        Row.height(3);
                        Row.backgroundColor('#007DFF');
                        Row.borderRadius(1.5);
                    }, Row);
                    Row.pop();
                    Stack.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(album.name);
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(389:7)", "entry");
            Text.fontSize(14);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2c3e50');
            Text.margin({ top: showProgress ? 0 : 8, bottom: 4 });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.width(120);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(album.artist);
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(398:7)", "entry");
            Text.fontSize(12);
            Text.fontColor('#95a5a6');
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.width(120);
        }, Text);
        Text.pop();
        Column.pop();
    }
    TrackCard(track: Track, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(411:5)", "entry");
            Row.width(260);
            Row.padding(10);
            Row.backgroundColor('#f8f9fa');
            Row.borderRadius(8);
            Row.margin({ right: 12, bottom: 10 });
            Row.onClick(() => this.playTrack(track));
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(412:7)", "entry");
            Column.width(50);
            Column.height(50);
            Column.borderRadius(4);
            Column.backgroundColor('#52B54B');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(track.name.substring(0, 1));
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(413:9)", "entry");
            Text.fontSize(20);
            Text.fontColor('#FFFFFF');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(424:7)", "entry");
            Column.layoutWeight(1);
            Column.margin({ left: 12 });
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(track.name);
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(425:9)", "entry");
            Text.fontSize(14);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2c3e50');
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.width(100);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(track.artist);
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(433:9)", "entry");
            Text.fontSize(12);
            Text.fontColor('#95a5a6');
            Text.margin({ top: 4 });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.width(100);
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(445:7)", "entry");
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.debugLine("products/entry/src/main/ets/pages/HomePage.ets(446:9)", "entry");
            Button.backgroundColor(Color.Transparent);
            Button.width(32);
            Button.height(32);
            Button.onClick(() => this.toggleLike(track.id));
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.isTrackLiked(track) ? '❤' : '🤍');
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(447:11)", "entry");
            Text.fontSize(16);
        }, Text);
        Text.pop();
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.debugLine("products/entry/src/main/ets/pages/HomePage.ets(455:9)", "entry");
            Button.backgroundColor(Color.Transparent);
            Button.width(32);
            Button.height(32);
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('➕');
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(456:11)", "entry");
            Text.fontSize(16);
        }, Text);
        Text.pop();
        Button.pop();
        Row.pop();
        Row.pop();
    }
    SectionHeader(title: string, sectionId: string, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(474:5)", "entry");
            Row.width('100%');
            Row.padding({ left: 16, right: 16, top: 20, bottom: 12 });
            Row.justifyContent(FlexAlign.SpaceBetween);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(475:7)", "entry");
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#2c3e50');
            Text.layoutWeight(1);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(481:7)", "entry");
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (sectionId === 'tracks') {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithChild();
                        Button.debugLine("products/entry/src/main/ets/pages/HomePage.ets(483:11)", "entry");
                        Button.width(28);
                        Button.height(28);
                        Button.backgroundColor('#007DFF');
                        Button.borderRadius(14);
                        Button.margin({ right: 8 });
                    }, Button);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('▶');
                        Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(484:13)", "entry");
                        Text.fontSize(14);
                        Text.fontColor('#FFFFFF');
                    }, Text);
                    Text.pop();
                    Button.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.debugLine("products/entry/src/main/ets/pages/HomePage.ets(495:9)", "entry");
            Button.backgroundColor(Color.Transparent);
            Button.width(32);
            Button.height(32);
            Button.onClick(() => {
                this.refreshSection(sectionId);
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('↻');
            Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(496:11)", "entry");
            Text.fontSize(16);
        }, Text);
        Text.pop();
        Button.pop();
        Row.pop();
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.loading && !this.refreshing) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.LoadingSkeleton.bind(this)();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(516:7)", "entry");
                        Column.width('100%');
                        Column.height('100%');
                        Column.backgroundColor('#ffffff');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(517:9)", "entry");
                        Row.width('100%');
                        Row.padding({ left: 16, right: 16, top: 16, bottom: 8 });
                        Row.justifyContent(FlexAlign.SpaceBetween);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('AudioDock');
                        Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(518:11)", "entry");
                        Text.fontSize(24);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor('#2c3e50');
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(523:11)", "entry");
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        if (this.mode === 'MUSIC') {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Button.createWithChild();
                                    Button.debugLine("products/entry/src/main/ets/pages/HomePage.ets(525:15)", "entry");
                                    Button.width(36);
                                    Button.height(36);
                                    Button.backgroundColor(this.isRadioMode ? '#007DFF20' : '#f0f0f0');
                                    Button.borderRadius(18);
                                    Button.margin({ right: 8 });
                                    Button.borderWidth(this.isRadioMode ? 1 : 0);
                                    Button.borderColor('#007DFF40');
                                    Button.onClick(() => this.toggleRadioMode());
                                }, Button);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create(this.isRadioMode ? '📻' : '⭕');
                                    Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(526:17)", "entry");
                                    Text.fontSize(18);
                                }, Text);
                                Text.pop();
                                Button.pop();
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                            });
                        }
                    }, If);
                    If.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithChild();
                        Button.debugLine("products/entry/src/main/ets/pages/HomePage.ets(539:13)", "entry");
                        Button.width(36);
                        Button.height(36);
                        Button.backgroundColor('#f0f0f0');
                        Button.borderRadius(18);
                        Button.onClick(() => this.toggleMode());
                    }, Button);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.mode === 'MUSIC' ? '🎵' : '🎧');
                        Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(540:15)", "entry");
                        Text.fontSize(18);
                    }, Text);
                    Text.pop();
                    Button.pop();
                    Row.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(554:9)", "entry");
                        Row.width('100%');
                        Row.height(44);
                        Row.padding({ left: 16, right: 16 });
                        Row.margin({ left: 16, right: 16 });
                        Row.backgroundColor('#f8f9fa');
                        Row.borderRadius(10);
                        Row.onClick(() => this.navigateToSearch());
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('🔍 搜索音乐、专辑、艺人...');
                        Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(555:11)", "entry");
                        Text.fontSize(14);
                        Text.fontColor('#95a5a6');
                    }, Text);
                    Text.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        List.create();
                        List.debugLine("products/entry/src/main/ets/pages/HomePage.ets(567:9)", "entry");
                        List.width('100%');
                        List.layoutWeight(1);
                        List.scrollBar(BarState.Off);
                        List.edgeEffect(EdgeEffect.Spring);
                        List.onScrollIndex((first: number) => {
                            // Scroll event
                        });
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const section = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    ListItem.debugLine("products/entry/src/main/ets/pages/HomePage.ets(569:13)", "entry");
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(570:15)", "entry");
                                        Column.width('100%');
                                        Column.alignItems(HorizontalAlign.Start);
                                    }, Column);
                                    this.SectionHeader.bind(this)(section.title, section.id);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Scroll.create();
                                        Scroll.debugLine("products/entry/src/main/ets/pages/HomePage.ets(573:17)", "entry");
                                        Scroll.scrollBar(BarState.Off);
                                        Scroll.scrollable(ScrollDirection.Horizontal);
                                    }, Scroll);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create();
                                        Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(574:19)", "entry");
                                        Row.padding({ left: 16, right: 16 });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (section.type === 'artist') {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    ForEach.create();
                                                    const forEachItemGenFunction = _item => {
                                                        const item = _item;
                                                        this.ArtistCard.bind(this)(item);
                                                    };
                                                    this.forEachUpdateFunction(elmtId, section.data as Artist[], forEachItemGenFunction);
                                                }, ForEach);
                                                ForEach.pop();
                                            });
                                        }
                                        else if (section.type === 'album') {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    ForEach.create();
                                                    const forEachItemGenFunction = _item => {
                                                        const item = _item;
                                                        this.AlbumCard.bind(this)(item, section.id === 'history');
                                                    };
                                                    this.forEachUpdateFunction(elmtId, section.data as Album[], forEachItemGenFunction);
                                                }, ForEach);
                                                ForEach.pop();
                                            });
                                        }
                                        else if (section.type === 'track') {
                                            this.ifElseBranchUpdateFunction(2, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Row.create();
                                                    Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(584:23)", "entry");
                                                }, Row);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    ForEach.create();
                                                    const forEachItemGenFunction = _item => {
                                                        const chunk = _item;
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Column.create();
                                                            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(586:27)", "entry");
                                                        }, Column);
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            ForEach.create();
                                                            const forEachItemGenFunction = _item => {
                                                                const track = _item;
                                                                this.TrackCard.bind(this)(track);
                                                            };
                                                            this.forEachUpdateFunction(elmtId, chunk, forEachItemGenFunction);
                                                        }, ForEach);
                                                        ForEach.pop();
                                                        Column.pop();
                                                    };
                                                    this.forEachUpdateFunction(elmtId, this.chunkTracks(section.data as Track[]), forEachItemGenFunction);
                                                }, ForEach);
                                                ForEach.pop();
                                                Row.pop();
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(3, () => {
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    Row.pop();
                                    Scroll.pop();
                                    Column.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.sections, forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                    {
                        const itemCreation = (elmtId, isInitialRender) => {
                            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                            ListItem.create(deepRenderFunction, true);
                            if (!isInitialRender) {
                                ListItem.pop();
                            }
                            ViewStackProcessor.StopGetAccessRecording();
                        };
                        const itemCreation2 = (elmtId, isInitialRender) => {
                            ListItem.create(deepRenderFunction, true);
                            ListItem.debugLine("products/entry/src/main/ets/pages/HomePage.ets(605:11)", "entry");
                        };
                        const deepRenderFunction = (elmtId, isInitialRender) => {
                            itemCreation(elmtId, isInitialRender);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create();
                                Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(606:13)", "entry");
                                Row.width('100%');
                                Row.padding(20);
                                Row.justifyContent(FlexAlign.Center);
                            }, Row);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('⚙️');
                                Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(607:15)", "entry");
                                Text.fontSize(16);
                                Text.margin({ right: 8 });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('调整板块顺序');
                                Text.debugLine("products/entry/src/main/ets/pages/HomePage.ets(611:15)", "entry");
                                Text.fontSize(14);
                                Text.fontColor('#007DFF');
                            }, Text);
                            Text.pop();
                            Row.pop();
                            ListItem.pop();
                        };
                        this.observeComponentCreation2(itemCreation2, ListItem);
                        ListItem.pop();
                    }
                    List.pop();
                    Column.pop();
                });
            }
        }, If);
        If.pop();
    }
    chunkTracks(tracks: Track[]): Track[][] {
        const result: Track[][] = [];
        for (let i = 0; i < tracks.length; i += 2) {
            const chunk: Track[] = [];
            chunk.push(tracks[i]);
            if (i + 1 < tracks.length) {
                chunk.push(tracks[i + 1]);
            }
            result.push(chunk);
        }
        return result;
    }
    LoadingSkeleton(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(649:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#ffffff');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(650:7)", "entry");
            Row.width('100%');
            Row.padding({ left: 16, right: 16, top: 20 });
            Row.justifyContent(FlexAlign.SpaceBetween);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(651:9)", "entry");
            Row.width(100);
            Row.height(28);
            Row.borderRadius(8);
            Row.backgroundColor('#e8e8e8');
        }, Row);
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(657:9)", "entry");
            Row.width(80);
            Row.height(36);
            Row.borderRadius(18);
            Row.backgroundColor('#e8e8e8');
        }, Row);
        Row.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(667:7)", "entry");
            Row.width('90%');
            Row.height(44);
            Row.borderRadius(10);
            Row.backgroundColor('#e8e8e8');
            Row.margin({ left: 16, right: 16, top: 16 });
        }, Row);
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const index = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(675:9)", "entry");
                    Column.margin({ top: 16 });
                    Column.alignItems(HorizontalAlign.Start);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(676:11)", "entry");
                    Row.width(120);
                    Row.height(24);
                    Row.borderRadius(8);
                    Row.backgroundColor('#e8e8e8');
                    Row.margin({ left: 16, bottom: 12 });
                }, Row);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(683:11)", "entry");
                    Row.padding({ left: 16 });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    ForEach.create();
                    const forEachItemGenFunction = _item => {
                        const i = _item;
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Column.create();
                            Column.debugLine("products/entry/src/main/ets/pages/HomePage.ets(685:15)", "entry");
                            Column.margin({ right: 16 });
                        }, Column);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Row.create();
                            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(686:17)", "entry");
                            Row.width(i === 1 ? 80 : 100);
                            Row.height(i === 1 ? 80 : 100);
                            Row.borderRadius(i === 1 ? 40 : 8);
                            Row.backgroundColor('#e8e8e8');
                            Row.margin({ bottom: 8 });
                        }, Row);
                        Row.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Row.create();
                            Row.debugLine("products/entry/src/main/ets/pages/HomePage.ets(693:17)", "entry");
                            Row.width(60);
                            Row.height(14);
                            Row.borderRadius(4);
                            Row.backgroundColor('#e8e8e8');
                        }, Row);
                        Row.pop();
                        Column.pop();
                    };
                    this.forEachUpdateFunction(elmtId, [1, 2, 3, 4], forEachItemGenFunction);
                }, ForEach);
                ForEach.pop();
                Row.pop();
                Column.pop();
            };
            this.forEachUpdateFunction(elmtId, [1, 2, 3], forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "HomePage";
    }
}
registerNamedRoute(() => new HomePage(undefined, {}), "", { bundleName: "com.audiodock.harmony", moduleName: "entry", pagePath: "pages/HomePage", pageFullPath: "products/entry/src/main/ets/pages/HomePage", integratedHsp: "false", moduleType: "followWithHap" });
