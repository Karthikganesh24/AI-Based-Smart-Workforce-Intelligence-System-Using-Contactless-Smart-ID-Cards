import { useQuery } from '@tanstack/react-query';
import { roomsService } from '@services/rooms';

export const useRoomOccupancy = () => {
  return useQuery({
    queryKey: ['rooms', 'occupancy'],
    queryFn: roomsService.getOccupancySummary,
    refetchInterval: false, // Disabled - using mock data in demo mode
    retry: false, // Don't retry failed requests
    enabled: false, // Don't fetch at all in demo mode
  });
};

export const useRoomDetails = (roomId: string) => {
  return useQuery({
    queryKey: ['rooms', roomId, 'occupancy'],
    queryFn: () => roomsService.getRoomDetails(roomId),
    enabled: !!roomId,
    refetchInterval: 5000,
  });
};

export const useRooms = () => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: roomsService.getAllRooms,
  });
};
