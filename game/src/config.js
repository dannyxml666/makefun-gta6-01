// Vice Metropolis - Configuration and Tuning Constants
export const CONFIG = {
  // Simulation
  TIMESTEP: 1 / 60,
  WORLD_SIZE: 400,
  BLOCK_SIZE: 40,
  ROAD_WIDTH: 12,
  PAVEMENT_WIDTH: 3,

  // Player stats
  PLAYER_SPEED_WALK: 4.5,
  PLAYER_SPEED_RUN: 8.0,
  PLAYER_ACCEL: 20.0,
  PLAYER_TURN_SPEED: 3.0,

  // Car stats
  CAR_MAX_SPEED: 35.0,
  CAR_ACCEL: 12.0,
  CAR_BRAKE: 25.0,
  CAR_TURN_SPEED: 2.2,
  CAR_DRAG: 0.98,

  // Combat & Health
  MAX_HEALTH: 100,
  MAX_ARMOUR: 100,
  PUNCH_RANGE: 3.0,
  PUNCH_DAMAGE: 25,

  // Missions
  MISSION_GETAWAY_TIME: 60,
  MISSION_DELIVERY_TIME: 90,
  MISSION_ESCAPE_TIME: 75,
};
