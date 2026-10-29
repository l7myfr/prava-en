import { useState } from 'react';

import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

interface SignCardProps {
    sign: {
        id: number;
        image: string;
        title: string;
    };
    isSelected?: boolean;
    onClick?: () => void;
}

export function SignCard({ sign, isSelected, onClick }: SignCardProps) {
    const { tc } = useLanguage();
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border bg-card p-2 transition-all',
                'hover:bg-accent hover:shadow-sm active:scale-95',
                isSelected &&
                    'border-primary bg-primary/5 ring-2 ring-primary/20',
            )}
        >
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted/50">
                {!imageLoaded && (
                    <div className="absolute inset-0 animate-pulse bg-muted" />
                )}
                <img
                    src={`/images/signs/${sign.image}`}
                    alt={tc(sign.title)}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    className={cn(
                        'h-full w-full object-contain p-1 transition-opacity duration-200',
                        imageLoaded ? 'opacity-100' : 'opacity-0',
                    )}
                />
            </div>
            <span className="line-clamp-2 w-full overflow-hidden text-center text-xs break-all text-muted-foreground">
                {tc(sign.title)}
            </span>
        </button>
    );
}
