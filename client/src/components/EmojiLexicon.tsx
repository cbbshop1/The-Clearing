import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { emojiLexicon } from "@/lib/emojiLexicon";

interface EmojiLexiconProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect?: (emoji: string) => void;
}

export default function EmojiLexicon({ isOpen, onClose, onEmojiSelect }: EmojiLexiconProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmojis = emojiLexicon.filter(emoji =>
    emoji.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emoji.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emoji.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEmojiClick = (emoji: string) => {
    if (onEmojiSelect) {
      onEmojiSelect(emoji);
    }
    // Copy to clipboard as well
    navigator.clipboard.writeText(emoji);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Emoji Lexicon
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Discover meaningful emojis for your conversations
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search emojis by meaning or emotion..."
            className="pl-10"
          />
        </div>

        {/* Lexicon Content */}
        <ScrollArea className="max-h-96">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmojis.map((emoji) => (
              <div
                key={emoji.emoji}
                className="p-4 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => handleEmojiClick(emoji.emoji)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{emoji.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{emoji.name}</h4>
                    <p className="text-sm text-muted-foreground">{emoji.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      {emoji.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredEmojis.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No emojis found matching your search.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
