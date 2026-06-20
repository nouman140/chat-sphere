import { format, isToday, isYesterday } from "date-fns";

export const getChatId = (uid1, uid2) => {
  return [uid1, uid2].sort().join("_");
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yyyy");
};

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, "HH:mm");
};

export const formatLastSeen = (timestamp) => {
  if (!timestamp) return "last seen recently";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isToday(date)) return `last seen today at ${format(date, "HH:mm")}`;
  if (isYesterday(date))
    return `last seen yesterday at ${format(date, "HH:mm")}`;
  return `last seen ${format(date, "dd/MM/yyyy")} at ${format(date, "HH:mm")}`;
};

export const groupMessagesByDate = (messages) => {
  const groups = {};
  messages.forEach((msg) => {
    if (!msg.createdAt) return;
    const date = msg.createdAt.toDate
      ? msg.createdAt.toDate()
      : new Date(msg.createdAt);
    let label;
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";
    else label = format(date, "MMMM d, yyyy");
    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
  });
  return groups;
};

export const getGroupInitials = (name = "") => {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "G"
  );
};
