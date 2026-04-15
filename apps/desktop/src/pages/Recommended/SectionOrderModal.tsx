import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Button, List, Modal, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SectionOrderModalProps {
  visible: boolean;
  onClose: () => void;
  sections: { id: string; title: string }[];
  onSave: (newOrder: string[]) => void;
}

const SectionOrderModal: React.FC<SectionOrderModalProps> = ({
  visible,
  onClose,
  sections,
  onSave,
}) => {
  const { t } = useTranslation();
  const [orderedSections, setOrderedSections] = useState(sections);

  useEffect(() => {
    if (visible) {
      setOrderedSections(sections);
    }
  }, [visible, sections]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedSections];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    setOrderedSections(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedSections.length - 1) return;
    const newOrder = [...orderedSections];
    [newOrder[index + 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index + 1],
    ];
    setOrderedSections(newOrder);
  };

  const handleSave = () => {
    onSave(orderedSections.map((s) => s.id));
    onClose();
  };

  return (
    <Modal
      title={t('sectionOrderModal.title')}
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <List
        dataSource={orderedSections}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button
                key="up"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => moveUp(index)}
                type="text"
              />,
              <Button
                key="down"
                icon={<ArrowDownOutlined />}
                disabled={index === orderedSections.length - 1}
                onClick={() => moveDown(index)}
                type="text"
              />,
            ]}
          >
            <Typography.Text>{item.title}</Typography.Text>
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default SectionOrderModal;
