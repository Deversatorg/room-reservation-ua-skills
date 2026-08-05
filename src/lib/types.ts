export type RoomDto = {
  id: string;
  name: string;
  floor: number;
  capacity: number;
};

export type BookingDto = {
  id: string;
  roomId: string;
  title: string;
  startAt: string;
  endAt: string;
  author: { id: string; name: string };
  room: { name: string; floor: number; capacity: number };
  canCancel: boolean;
};
