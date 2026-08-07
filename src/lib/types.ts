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
  isOwner: boolean;
  canCancel: boolean;
  series: { id: string; occurrence: number; count: number } | null;
};

export type AvailabilityOption = {
  room: RoomDto;
  officeDate: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
};

export type AvailabilitySearchResult = {
  requested: {
    officeDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    minCapacity: number;
  };
  exact: AvailabilityOption[];
  alternatives: AvailabilityOption[];
};

export type NotificationDto = {
  id: string;
  currentTitle: string;
  nextTitle: string;
  roomName: string;
  endAt: string;
  deliveredAt: string;
  readAt: string | null;
};
