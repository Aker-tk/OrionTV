import React, { memo } from 'react';
import { TouchableOpacity } from 'react-native';
import { DeviceType, useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { API } from '@/services/api';

// 导入不同平台的VideoCard组件
import VideoCardMobile from './VideoCard.mobile';
import VideoCardTablet from './VideoCard.tablet';
import VideoCardTV from './VideoCard.tv';

interface VideoCardProps extends React.ComponentProps<typeof TouchableOpacity> {
  id: string;
  source: string;
  title: string;
  poster: string;
  year?: string;
  rate?: string;
  sourceName?: string;
  progress?: number;
  playTime?: number;
  episodeIndex?: number;
  totalEpisodes?: number;
  onFocus?: () => void;
  onRecordDeleted?: () => void;
  api: API;
  deviceType?: DeviceType;
  cardWidth?: number;
  cardHeight?: number;
  spacing?: number;
}

/**
 * 响应式VideoCard组件
 * 根据设备类型自动选择合适的VideoCard实现
 */
const renderPlatformCard = (props: VideoCardProps, ref: React.ForwardedRef<any>) => {
  const { deviceType = 'tv' } = props;

  switch (deviceType) {
    case 'mobile':
      return <VideoCardMobile {...props} ref={ref} />;
    
    case 'tablet':
      return <VideoCardTablet {...props} ref={ref} />;
    
    case 'tv':
    default:
      return <VideoCardTV {...props} ref={ref} />;
  }
};

const VideoCardWithResponsiveLayout = React.forwardRef<any, VideoCardProps>((props, ref) => {
  const layout = useResponsiveLayout();
  return renderPlatformCard({ ...props, ...layout }, ref);
});

VideoCardWithResponsiveLayout.displayName = 'VideoCardWithResponsiveLayout';

const VideoCard = React.forwardRef<any, VideoCardProps>((props, ref) => {
  if (props.deviceType && props.cardWidth && props.cardHeight && props.spacing !== undefined) {
    return renderPlatformCard(props, ref);
  }

  return <VideoCardWithResponsiveLayout {...props} ref={ref} />;
});

VideoCard.displayName = 'VideoCard';

export default memo(VideoCard);
