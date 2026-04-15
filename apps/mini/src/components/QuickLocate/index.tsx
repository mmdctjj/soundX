import { Text, View } from '@tarojs/components';
import './index.scss';

interface QuickLocateProps {
  onTop: () => void;
  onBottom: () => void;
  onLocate?: () => void;
  showLocate?: boolean;
  locateDisabled?: boolean;
  onHeartbeatToggle?: () => void;
  showHeartbeat?: boolean;
  heartbeatActive?: boolean;
}

export default function QuickLocate({
  onTop,
  onBottom,
  onLocate,
  showLocate = true,
  locateDisabled = false,
  onHeartbeatToggle,
  showHeartbeat = false,
  heartbeatActive = false,
}: QuickLocateProps) {
  return (
    <View className='quick-locate'>
      <View className='quick-locate-btn' onClick={onTop}>
        <Text className='quick-locate-icon icon icon-arrow-up' />
      </View>

      {showLocate && onLocate && (
        <View
          className={`quick-locate-btn ${locateDisabled ? 'disabled' : ''}`}
          onClick={() => {
            if (!locateDisabled) onLocate();
          }}
        >
          <Text className='quick-locate-icon icon icon-locate' />
        </View>
      )}

      {showHeartbeat && onHeartbeatToggle && (
        <View
          className={`quick-locate-btn heartbeat-btn ${heartbeatActive ? 'active' : ''}`}
          onClick={onHeartbeatToggle}
        >
          <Text
            className={`quick-locate-icon icon ${heartbeatActive ? 'icon-heart-filled' : 'icon-heart'}`}
          />
        </View>
      )}

      <View className='quick-locate-btn' onClick={onBottom}>
        <Text className='quick-locate-icon icon icon-arrow-down' />
      </View>
    </View>
  );
}
