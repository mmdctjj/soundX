import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from "react-i18next";
import { Button, Modal, Typography } from 'antd';
import React from 'react';
import type { UpdateInfo } from '../hooks/useCheckUpdate';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isWeb } from '../utils/platform';

const { Paragraph, Text } = Typography;

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
        if ((window as any).ipcRenderer) {
            (window as any).ipcRenderer.openExternal(updateInfo.downloadUrl);
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {updateInfo.body}
            </ReactMarkdown>
        </div>
      </div>
    </Modal>
  );
};

export default UpdateModal;
