import type { MessageInstance } from "antd/es/message/interface";
import React, { createContext, useContext } from "react";

interface MessageContextType {
  messageApi: MessageInstance;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used within MessageProvider");
  }
  return context.messageApi;
};

export const MessageProvider: React.FC<{
  children: React.ReactNode;
  messageApi: MessageInstance;
}> = ({ children, messageApi }) => {
  return (
    <MessageContext.Provider value={{ messageApi }}>
      {children}
    </MessageContext.Provider>
  );
};
