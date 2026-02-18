export type Direction = 0 | 1 | 2 | 3; // N E S W

export type CakeFlavour = 'vanilla' | 'chocolate';

export type PlateContents =
  | { slice: { flavour: CakeFlavour; heated: boolean } }
  // future: | { soup: ... } | ...
  ;

export type CarriedItem =
  | { type: 'nothing' }
  | { type: 'clean_plates'; count: number }
  | { type: 'plate'; contents: PlateContents | null }
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
  heatProgress: number; // 0..heatTime, when >= heatTime then "done"
  heatTime: number;
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
