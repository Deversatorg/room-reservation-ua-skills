import "server-only";

type BookingRecord = {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  room: { name: string; floor: number; capacity: number };
  user: { id: string; name: string };
};

export function bookingDto(booking: BookingRecord, currentUserId: string) {
  return {
    id: booking.id,
    roomId: booking.roomId,
    title: booking.title,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    author: booking.user,
    room: booking.room,
    canCancel: booking.userId === currentUserId,
  };
}

export const bookingInclude = {
  room: { select: { name: true, floor: true, capacity: true } },
  user: { select: { id: true, name: true } },
} as const;
