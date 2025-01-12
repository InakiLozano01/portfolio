interface TextWithEmojiProps {
  text: string;
  className?: string;
}

export default function TextWithEmoji({ text, className = '' }: TextWithEmojiProps) {
  // Split text into segments, preserving emojis
  const segments = text.split(/([\u{1F300}-\u{1F9FF}]|\p{Extended_Pictographic})/gu);
  
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        const isEmoji = /[\u{1F300}-\u{1F9FF}]|\p{Extended_Pictographic}/u.test(segment);
        return (
          <span
            key={index}
            className={isEmoji ? 'inline-block align-middle mx-0.5' : 'inline'}
          >
            {segment}
          </span>
        );
      })}
    </span>
  );
} 