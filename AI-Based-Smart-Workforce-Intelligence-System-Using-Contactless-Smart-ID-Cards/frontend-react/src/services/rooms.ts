import api from './api';
import type { Room, RoomOccupancySummary } from '@models/room';
import type { ApiResponse } from '@models/api';

export const roomsService = {
  getOccupancySummary: async (): Promise<RoomOccupancySummary> => {
    const { data } = await api.get<ApiResponse<RoomOccupancySummary>>('/rooms/occupancy/summary');
    if (!data.data) throw new Error('Failed to fetch room occupancy');
    return data.data;
  },

  getRoomDetails: async (roomId: string): Promise<Room> => {
    const { data } = await api.get<ApiResponse<Room>>(`/rooms/${roomId}/occupancy`);
    if (!data.data) throw new Error('Room not found');
    return data.data;
  },

  getAllRooms: async (): Promise<Room[]> => {
    const { data } = await api.get<ApiResponse<Room[]>>('/rooms');
    return data.data || [];
  },
};
