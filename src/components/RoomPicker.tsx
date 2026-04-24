import { useTranslation } from "react-i18next";
import { useRooms } from "@/hooks/useRooms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface RoomPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function RoomPicker({ value, onValueChange, className }: RoomPickerProps) {
  const { t } = useTranslation();
  const { data: rooms } = useRooms();

  if (!rooms || rooms.length === 0) return null;

  return (
    <div className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder={t('timer.no_room_selected', 'Nenhuma sala')} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">{t('timer.no_room', 'Sem sala')}</span>
          </SelectItem>
          {rooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
