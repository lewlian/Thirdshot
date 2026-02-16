import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sun, Lightbulb, Clock } from "lucide-react";
import type { Court } from "@prisma/client";

interface CourtCardProps {
  court: Court;
}

export function CourtCard({ court }: CourtCardProps) {
  const pricePerHour = (court.pricePerHourCents / 100).toFixed(0);
  const peakPrice = court.peakPricePerHourCents
    ? (court.peakPricePerHourCents / 100).toFixed(0)
    : null;

  return (
    <Card className="group card-elevated border-0 rounded-2xl overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold mb-1.5">{court.name}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {court.description}
            </CardDescription>
          </div>
          {court.isIndoor ? (
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 rounded-full px-3 py-1 text-xs font-medium">
              Indoor
            </Badge>
          ) : (
            <Badge className="bg-accent/10 text-accent hover:bg-accent/10 border-0 rounded-full px-3 py-1 text-xs font-medium">
              <Sun className="h-3 w-3 mr-1" />
              Outdoor
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {court.surfaceType && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {court.surfaceType}
            </span>
          )}
          {court.hasLighting && (
            <span className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Lighting
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {court.openTime} - {court.closeTime}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/50">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                ${pricePerHour}
              </span>
              <span className="text-sm text-muted-foreground">/hour</span>
            </div>
            {peakPrice && (
              <span className="text-xs text-muted-foreground">
                ${peakPrice}/hr peak hours
              </span>
            )}
          </div>
          <Button
            className="rounded-full bg-primary hover:bg-primary/90 px-6 py-2.5 h-auto font-medium shadow-sm"
            asChild
          >
            <Link href={`/courts/${court.id}`}>
              Book Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
