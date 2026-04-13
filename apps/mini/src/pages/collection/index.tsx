import { Album, getCollectionById } from '@soundx/services';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import BottomTabBar from '../../components/BottomTabBar';
import MiniPlayer from '../../components/MiniPlayer';
import { getBaseURL } from '../../utils/request';
import './index.scss';

type CollectionDetail = {
  id: number | string;
  name: string;
  cover?: string | null;
  items?: Array<{ album: Album }>;
};

export default function CollectionPage() {
  const router = useRouter();
  const { id } = router.params;
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await getCollectionById(String(id));
        if (res.code === 200 && res.data) {
          const data = res.data as CollectionDetail;
          setCollection(data);
          setAlbums((data.items || []).map((item) => item.album).filter(Boolean));
        }
      } catch (error) {
        console.error('Failed to load collection:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://picsum.photos/300/300';
    if (url.startsWith('http')) return url;
    return `${getBaseURL()}${url}`;
  };

  if (loading) return <View className='loading'><Text>Loading...</Text></View>;
  if (!collection) return <View className='error'><Text>合集不存在</Text></View>;

  return (
    <View className='collection-container'>
      <View className='nav-bar'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' />
        </View>
      </View>

      <ScrollView scrollY className='content-scroll'>
        <View className='header'>
          <Image
            src={getImageUrl(collection.cover || albums[0]?.cover || null)}
            className='cover'
            mode='aspectFill'
          />
          <Text className='title'>{collection.name}</Text>
          <Text className='meta'>{`${albums.length} 张专辑`}</Text>
        </View>

        <View className='album-grid'>
          {albums.map((album) => (
            <View
              key={album.id}
              className='album-card'
              onClick={() => Taro.navigateTo({ url: `/pages/album/index?id=${album.id}` })}
            >
              <Image src={getImageUrl(album.cover)} className='album-cover' mode='aspectFill' />
              <Text className='album-name' numberOfLines={1}>{album.name}</Text>
              <Text className='album-artist' numberOfLines={1}>{album.artist}</Text>
            </View>
          ))}
        </View>
        <View className='page-bottom-spacer' />
      </ScrollView>

      <BottomTabBar />
      <MiniPlayer />
    </View>
  );
}
