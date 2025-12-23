import { contextBridge, ipcRenderer } from 'electron';

// Store wrapped listeners so we can properly remove them
const listenerMap = new WeakMap<Function, Function>();

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    // Create wrapped listener
    const wrappedListener = (event: any, ...args: any[]) => listener(event, ...args);
    // Store mapping
    listenerMap.set(listener, wrappedListener);
    return ipcRenderer.on(channel, wrappedListener)
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, listener] = args
    // Get the wrapped listener
    const wrappedListener = listenerMap.get(listener as Function);
    if (wrappedListener) {
      listenerMap.delete(listener as Function);
      return ipcRenderer.off(channel, wrappedListener as any);
    }
    return ipcRenderer.off(channel, listener);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  platform: process.platform,
  getName: async () => {
    return await ipcRenderer.invoke("get-device-name")
  },
  openExternal: (url: string) => ipcRenderer.invoke("open-url", url),
})
