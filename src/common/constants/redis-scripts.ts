export const RESERVE_TICKET_LUA = `
  -- Cek apakah kursi sudah dipesan secara permanen
  local isBooked = redis.call("get", KEYS[1])
  if isBooked then
      return -1 -- Status: Sudah dipesan
  end

  -- Cek/Pasang Lock sementara (Distributed Locking)
  local isLocked = redis.call("set", KEYS[2], ARGV[1], "EX", ARGV[2], "NX")
  if isLocked then
      return 1 -- Status: Berhasil Lock
  else
      return 0 -- Status: Sedang diproses orang lain
  end
`;
