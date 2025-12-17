import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map<UserId, SocketId[]> - Stores all active socket IDs for a user
  private userSockets = new Map<number, string[]>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    const deviceName = client.handshake.query.deviceName;
    
    console.log(`Client connected: ${client.id}, User: ${userId}, Device: ${deviceName}`);

    if (userId) {
      const uid = parseInt(userId as string, 10);
      const sockets = this.userSockets.get(uid) || [];
      sockets.push(client.id);
      this.userSockets.set(uid, sockets);
      
      // Join a room named by user ID for easy broadcasting to specific users
      client.join(`user_${uid}`);
    }
  }

  @SubscribeMessage('leave_session')
  handleLeave(client: Socket, payload: { sessionId: string }) {
      const userId = client.handshake.query.userId;
      console.log(`User ${userId} leaving session ${payload.sessionId}`);

      // DEBUG: Check room members
      const room = this.server.sockets.adapter.rooms.get(payload.sessionId);
      console.log(`Room ${payload.sessionId} has members:`, room ? Array.from(room) : 'empty');
      
      this.server.to(payload.sessionId).emit('session_ended', {
          reason: 'user_left',
          fromUserId: userId
      });
      
      client.leave(payload.sessionId);
  }    

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId;
    console.log(`Client disconnected: ${client.id}`);

    if (userId) {
      const uid = parseInt(userId as string, 10);
      const sockets = this.userSockets.get(uid) || [];
      const updatedSockets = sockets.filter(id => id !== client.id);
      
      if (updatedSockets.length > 0) {
        this.userSockets.set(uid, updatedSockets);
      } else {
        this.userSockets.delete(uid);
      }
    }
  }

  @SubscribeMessage('invite')
  handleInvite(client: Socket, payload: { targetUserIds: number[]; currentTrack?: any; playlist?: any; progress?: number }) {
    const senderId = parseInt(client.handshake.query.userId as string, 10);
    console.log(`User ${senderId} inviting users: ${payload.targetUserIds}`);
    
    payload.targetUserIds.forEach(targetId => {
      // Emit 'invite_received' to all devices of the target user
      this.server.to(`user_${targetId}`).emit('invite_received', {
        fromUserId: senderId,
        currentTrack: payload.currentTrack,
        playlist: payload.playlist,
        progress: payload.progress,
        timestamp: new Date(),
      });
    });
  }

  @SubscribeMessage('respond_invite')
  handleRespondInvite(client: Socket, payload: { fromUserId: number, accept: boolean }) {
    const responderId = parseInt(client.handshake.query.userId as string, 10);
    const targetRoom = `sync_session_${payload.fromUserId}_${responderId}`; // Simplified session ID logic

    if (payload.accept) {
      console.log(`User ${responderId} accepted invite from ${payload.fromUserId}`);
      
      // Join both users to a shared sync room
      // Get all sockets for both users (simplified: assuming current socket for now, ideally all devices of user join)
       const senderSockets = this.userSockets.get(Number(payload.fromUserId)) || [];
       const responderSockets = this.userSockets.get(responderId) || [];

       senderSockets.forEach(sid => {
           const s = this.server.sockets.sockets.get(sid);
           s?.join(targetRoom);
       });
       responderSockets.forEach(sid => {
           const s = this.server.sockets.sockets.get(sid);
           s?.join(targetRoom);
       });

      this.server.to(targetRoom).emit('sync_session_started', {
        sessionId: targetRoom,
        users: [payload.fromUserId, responderId],
      });
      
      // Request initial state from the inviter
       this.server.to(`user_${payload.fromUserId}`).emit('request_initial_state', { targetRoom });

    } else {
       console.log(`User ${responderId} rejected invite from ${payload.fromUserId}`);
       // Notify the sender that the invite was rejected
       this.server.to(`user_${payload.fromUserId}`).emit('invite_rejected', {
           fromUserId: responderId
       });
    }
  }

  @SubscribeMessage('sync_command')
  handleSyncCommand(client: Socket, payload: { 
      sessionId: string, 
      type: 'play' | 'pause' | 'seek' | 'track_change' | 'playlist_change', 
      data: any 
  }) {
    // Broadcast the command to everyone in the session EXCEPT the sender
    client.to(payload.sessionId).emit('sync_event', {
       type: payload.type,
       data: payload.data,
       senderId: client.handshake.query.userId
    });
  }
}
