/** Curated shortcodes for day-to-day writing (dev/consultant + household). */
export interface EmojiShortcode {
  id: string;
  emoji: string;
}

export const EMOJI_SHORTCODES: EmojiShortcode[] = [
  // Status / feedback
  { id: "check", emoji: "✅" },
  { id: "x", emoji: "❌" },
  { id: "warning", emoji: "⚠️" },
  { id: "question", emoji: "❓" },
  { id: "exclamation", emoji: "❗" },
  { id: "+1", emoji: "👍" },
  { id: "-1", emoji: "👎" },
  { id: "eyes", emoji: "👀" },
  { id: "thinking", emoji: "🤔" },
  { id: "smile", emoji: "😄" },
  { id: "tada", emoji: "🎉" },
  { id: "clap", emoji: "👏" },
  { id: "fire", emoji: "🔥" },
  { id: "100", emoji: "💯" },
  { id: "star", emoji: "⭐" },
  { id: "sparkles", emoji: "✨" },

  // Work / tech
  { id: "rocket", emoji: "🚀" },
  { id: "bulb", emoji: "💡" },
  { id: "memo", emoji: "📝" },
  { id: "pencil", emoji: "✏️" },
  { id: "book", emoji: "📖" },
  { id: "laptop", emoji: "💻" },
  { id: "phone", emoji: "📱" },
  { id: "email", emoji: "📧" },
  { id: "calendar", emoji: "📅" },
  { id: "clock", emoji: "🕐" },
  { id: "chart", emoji: "📊" },
  { id: "link", emoji: "🔗" },
  { id: "lock", emoji: "🔒" },
  { id: "key", emoji: "🔑" },
  { id: "wrench", emoji: "🔧" },
  { id: "bug", emoji: "🐛" },
  { id: "package", emoji: "📦" },
  { id: "folder", emoji: "📁" },

  // People / meeting
  { id: "wave", emoji: "👋" },
  { id: "handshake", emoji: "🤝" },
  { id: "coffee", emoji: "☕" },
  { id: "tea", emoji: "🍵" },
  { id: "pizza", emoji: "🍕" },

  // Household / daily
  { id: "house", emoji: "🏠" },
  { id: "bed", emoji: "🛏️" },
  { id: "shower", emoji: "🚿" },
  { id: "shirt", emoji: "👕" },
  { id: "jeans", emoji: "👖" },
  { id: "shoe", emoji: "👟" },
  { id: "water", emoji: "💧" },
  { id: "shopping_cart", emoji: "🛒" },
  { id: "broom", emoji: "🧹" },
  { id: "soap", emoji: "🧼" },
  { id: "door", emoji: "🚪" },
  { id: "apple", emoji: "🍎" },
  { id: "bread", emoji: "🍞" },
];
