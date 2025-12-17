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
  async handleInvite(client: Socket, payload: { targetUserIds: number[]; currentTrack?: any; playlist?: any; progress?: number }) {
    const senderId = parseInt(client.handshake.query.userId as string, 10);
    const senderResult = this.socketMetadata.get(client.id);
    const senderDeviceName = senderResult?.deviceName || 'Unknown Device';

    const senderUser = await this.userService.getUserById(senderId);
    const senderUsername = senderUser?.username || `User ${senderId}`;
    
    console.log(`User ${senderId} (${senderDeviceName}) inviting users: ${payload.targetUserIds}`);
    
    payload.targetUserIds.forEach(targetId => {
      // Emit 'invite_received' to all devices of the target user
      this.server.to(`user_${targetId}`).emit('invite_received', {
        fromUserId: senderId,
        fromUsername: senderUsername,
        fromDeviceName: senderDeviceName, // Pass sender device name
        fromSocketId: client.id, // Pass sender socket ID to target specific device later
        currentTrack: payload.currentTrack,
        playlist: payload.playlist,
        progress: payload.progress,
        timestamp: new Date(),
      });
    });
  }

  @SubscribeMessage('respond_invite')
  handleRespondInvite(client: Socket, payload: { fromUserId: number, fromSocketId?: string, accept: boolean }) {
    const responderId = parseInt(client.handshake.query.userId as string, 10);
    const targetRoom = `sync_session_${payload.fromUserId}_${responderId}_${Date.now()}`; // Unique session ID

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
      console.log(`User ${responderId} accepted invite from ${payload.fromUserId}`);
      
       // Join both users to a shared sync room
       // Join Sender (Specific Socket)
       if (payload.fromSocketId) {
           const senderSocket = this.server.sockets.sockets.get(payload.fromSocketId);
           if (senderSocket) {
               senderSocket.join(targetRoom);
           } else {
               // Fallback: If socket ID is missing/invalid (disconnect?), try to find ANY socket for user?
               // Or fail? For now, let's fall back to all sockets just to be safe OR strictly fail.
               // Given requirements, strict is better, but fallback prevents total failure if reconnected.
               // Let's stick to strict logic for "Device 2 should not sync".
               console.warn(`Sender socket ${payload.fromSocketId} not found, sync might fail for sender.`);
           }
       } else {
           // Legacy fallback (shouldn't happen with updated client)
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
        users: [payload.fromUserId, responderId],
      });
      
      // Request initial state from the inviter
       this.server.to(`user_${payload.fromUserId}`).emit('request_initial_state', { targetRoom });
       // Note: request_initial_state also goes to `user_...` room which hits ALL devices.
       // We should target the specific socket too?
       // `this.server.to(payload.fromSocketId).emit(...)`
       if (payload.fromSocketId) {
           this.server.to(payload.fromSocketId).emit('request_initial_state', { targetRoom });
       }

    } else {
       console.log(`User ${responderId} rejected invite from ${payload.fromUserId}`);
       // Notify the sender that the invite was rejected
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
