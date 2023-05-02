export type SendSoundBody = {
  name: string;
};

export type APlaySpeakerDevice = {
  card: number;
  description: string;
  name: string;
};

export type PlaySoundCommand = {
  card?: number;
  sound: string;
};

export const NO_SOUND_DEVICE = -1;
