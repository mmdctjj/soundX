import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from "react-i18next";
import { Button, Modal, Typography } from 'antd';
import React from 'react';
import type { UpdateInfo } from '../hooks/useCheckUpdate';

import MarkdownContent from './MarkdownContent';
import { isWeb } from '../utils/platform';

const { Paragraph, Text } = Typography;

type IpcRendererBridge = {
  openExternal: (url: string) => void;
};

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onCancel: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo, onCancel }) => {
  const { t } = useTranslation();
  if (!updateInfo) return null;
  const isWebRuntime = isWeb();

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
        const ipcRenderer = (window as Window & { ipcRenderer?: IpcRendererBridge }).ipcRenderer;
        if (ipcRenderer) {
            ipcRenderer.openExternal(updateInfo.downloadUrl);
        } else {
            window.open(updateInfo.downloadUrl, '_blank');
        }
    }
  };

  return (
    <Modal
      title={t('updateModal.newVersion', { version: updateInfo.version })}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {isWebRuntime ? t('common.ok') : t('updateModal.updateLater')}
        </Button>,
        ...(!isWebRuntime
          ? [
              <Button
                key="download"
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              >
                {t('updateModal.goToDownload')}
              </Button>,
            ]
          : []),
      ]}
    >
      {isWebRuntime && (
        <Paragraph>
          <Text type="secondary">
            {t('updateModal.webUpdateNote')}
          </Text>
        </Paragraph>
      )}
      <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px 0' }}>
        <Paragraph>
          <Text strong>{t('updateModal.updateContent')}</Text>
        </Paragraph>
        <div style={{ lineHeight: '1.6' }}>
            <MarkdownContent>
              {updateInfo.body}
            </MarkdownContent>
        </div>
      </div>
    </Modal>
  );
};

export default UpdateModal;
