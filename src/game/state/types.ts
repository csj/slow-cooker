export type Direction = 0 | 1 | 2 | 3; // N E S W

export type CakeFlavour = 'vanilla' | 'chocolate';

export type Food =
  | { type: 'slice'; flavour: CakeFlavour; heated: boolean; heatTime: number }
  // future: | { type: 'soup'; heatTime: number; heated: boolean; ... }
  ;

export type CarriedItem =
  | { type: 'nothing' }
  | { type: 'clean_plates'; count: number }
  | { type: 'plate'; contents: Food[] }
  | { type: 'dirty_plates'; count: number };

export type QueuedAction = { type: 'Move'; dir: Direction };

export type Chef = {
  id: number;
  x: number;
  y: number;
  facing: Direction;
  actionQueue: QueuedAction[];
  carried: CarriedItem;
};

export type TileType = 'floor' | 'wall' | 'sink_take' | 'sink_wash' | 'cake_box' | 'microwave' | 'delivery_window' | 'table';

export type CakeBoxStation = {
  flavour: CakeFlavour;
};

export type MicrowaveStation = {
  contents: CarriedItem | null;
  heatProgress: number;
  heatTime: number; // from the food inside when added, not intrinsic
};

export type TableStation = {
  item: CarriedItem | null;
};

export type SinkStation = {
  dirtyCount: number;
  cleanCount: number;
};

export type DeliveryStation = {
  dirtyCount: number;
};
