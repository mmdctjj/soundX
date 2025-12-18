import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from '../services/user';


@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly userService: UserService) {}

  // Map<UserId, SocketId[]> - Stores all active socket IDs for a user
  private userSockets = new Map<number, string[]>();
  // Assuming socketMetadata is defined elsewhere or will be added.
  // For now, I'll add a placeholder to avoid compilation errors for `this.socketMetadata`.
  private socketMetadata = new Map<string, { deviceName: string }>();


  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    const deviceName = client.handshake.query.deviceName as string;
    
    console.log(`Client connected: ${client.id}, User: ${userId}, Device: ${deviceName}`);

    if (userId) {
      const uid = parseInt(userId as string, 10);
      const sockets = this.userSockets.get(uid) || [];
      sockets.push(client.id);
      this.userSockets.set(uid, sockets);
      
      this.socketMetadata.set(client.id, { deviceName });
      
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
      this.socketMetadata.delete(client.id);
    }
  }

  @SubscribeMessage('invite')
  async handleInvite(client: Socket, payload: { targetUserIds: number[]; currentTrack?: any; playlist?: any; progress?: number; sessionId?: string }) {
    const senderId = parseInt(client.handshake.query.userId as string, 10);
    const senderResult = this.socketMetadata.get(client.id);
    const senderDeviceName = senderResult?.deviceName || 'Unknown Device';

    const senderUser = await this.userService.getUserById(senderId);
    const senderUsername = senderUser?.username || `User ${senderId}`;
    
    // Use provided sessionId or generate fallback (though frontend should provide it)
    const sessionId = payload.sessionId || `sync_session_${senderId}_${Date.now()}`;

    console.log(`User ${senderId} (${senderDeviceName}) inviting users: ${payload.targetUserIds} to session ${sessionId}`);
    
    payload.targetUserIds.forEach(targetId => {
      // Emit 'invite_received' to all devices of the target user
      this.server.to(`user_${targetId}`).emit('invite_received', {
        fromUserId: senderId,
        fromUsername: senderUsername,
        fromDeviceName: senderDeviceName,
        fromSocketId: client.id,
        sessionId: sessionId, // Pass session ID
        currentTrack: payload.currentTrack,
        playlist: payload.playlist,
        progress: payload.progress,
        timestamp: new Date(),
      });
    });
  }

  @SubscribeMessage('respond_invite')
  handleRespondInvite(client: Socket, payload: { fromUserId: number, fromSocketId?: string, sessionId?: string, accept: boolean }) {
    const responderId = parseInt(client.handshake.query.userId as string, 10);
    // Use passed sessionId if available, else fallback (legacy behavior)
    const targetRoom = payload.sessionId || `sync_session_${payload.fromUserId}_${responderId}_${Date.now()}`;

    // Broadcast manually to other devices of the responder to close their invites
    const responderSockets = this.userSockets.get(responderId) || [];
    responderSockets.forEach(sid => {
        if (sid !== client.id) {
            this.server.to(sid).emit('invite_handled', {
                fromUserId: payload.fromUserId,
                handledByDevice: this.socketMetadata.get(client.id)?.deviceName
            });
        }
    });

    if (payload.accept) {
      console.log(`User ${responderId} accepted invite from ${payload.fromUserId} for session ${targetRoom}`);
      
       // Join Sender (Specific Socket)
       if (payload.fromSocketId) {
           const senderSocket = this.server.sockets.sockets.get(payload.fromSocketId);
           if (senderSocket) {
               senderSocket.join(targetRoom);
           } else {
               console.warn(`Sender socket ${payload.fromSocketId} not found, sync might fail for sender.`);
           }
       } else {
           // Fallback logic
           const senderSockets = this.userSockets.get(Number(payload.fromUserId)) || [];
           senderSockets.forEach(sid => {
                const s = this.server.sockets.sockets.get(sid);
                s?.join(targetRoom);
           });
       }
       
       // Join Responder (Current Socket)
       client.join(targetRoom);

      this.server.to(targetRoom).emit('sync_session_started', {
        sessionId: targetRoom,
        users: [payload.fromUserId, responderId], // Note: this list might need to accumulate? For now, just notifying triggers sync.
      });
      
      // Request initial state from the inviter (SENDER)
      // We send this to the specific sender socket if possible
       if (payload.fromSocketId) {
           this.server.to(payload.fromSocketId).emit('request_initial_state', { targetRoom });
       } else {
           this.server.to(`user_${payload.fromUserId}`).emit('request_initial_state', { targetRoom });
       }

    } else {
        // ... rejection logic remains same ...
       console.log(`User ${responderId} rejected invite from ${payload.fromUserId}`);
       if (payload.fromSocketId) {
           this.server.to(payload.fromSocketId).emit('invite_rejected', { fromUserId: responderId });
       } else {
           this.server.to(`user_${payload.fromUserId}`).emit('invite_rejected', { fromUserId: responderId });
       }
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
