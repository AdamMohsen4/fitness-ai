// Lucide React Native icons - modern, consistent icon library used by Notion, Linear, GitHub

import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';

// Import the specific icons we need
import { House, Send, Code, ChevronRight, Map, Flame, Activity } from 'lucide-react-native';

type IconMapping = {
  'house.fill': typeof House;
  'paperplane.fill': typeof Send;
  'chevron.left.forwardslash.chevron.right': typeof Code;
  'chevron.right': typeof ChevronRight;
  'map.fill': typeof Map;
  'flame.fill': typeof Flame;
  'run.fill': typeof Activity;
};

type IconSymbolName = keyof IconMapping;

/**
 * Lucide icon mappings for SF Symbol names.
 * Lucide icons are modern, consistent, and used by Notion, Linear, GitHub.
 */
const MAPPING: IconMapping = {
  'house.fill': House,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
  'map.fill': Map,
  'flame.fill': Flame,
  'run.fill': Activity,
};

/**
 * An icon component that uses Lucide React Native icons.
 * These are modern, consistent icons used by Notion, Linear, GitHub, and other top apps.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const LucideIconComponent = MAPPING[name];
  
  return (
    <LucideIconComponent 
      color={color} 
      size={size} 
      style={style}
      strokeWidth={2}
    />
  );
}
