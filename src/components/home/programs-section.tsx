"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Users, User, Building2, HelpCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Program {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
}

const programs: Program[] = [
  {
    id: "private-coaching",
    title: "Private Coaching",
    description: "One-on-one sessions with expert coaches",
    icon: User,
    content: "Private coaching content placeholder. This will include details about individual coaching sessions, pricing, and how to book a session with our expert coaches.",
  },
  {
    id: "group-coaching",
    title: "Group Coaching",
    description: "Learn and play with others",
    icon: Users,
    content: "Group coaching content placeholder. Information about group training sessions, skill levels, schedules, and how to join a group coaching program.",
  },
  {
    id: "corporate-events",
    title: "Corporate Events",
    description: "Team building and corporate packages",
    icon: Building2,
    content: "Corporate events content placeholder. Details about corporate packages, team building activities, catering options, and how to book for your company.",
  },
  {
    id: "faqs",
    title: "FAQs",
    description: "Frequently asked questions",
    icon: HelpCircle,
    content: "FAQs content placeholder. Common questions about our facilities, booking process, cancellation policies, equipment rental, and more.",
  },
];

export function ProgramsSection() {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleClose = () => setSelectedProgram(null);

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Programs & Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Explore our coaching programs and services
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((program) => {
            const Icon = program.icon;
            return (
              <Card
                key={program.id}
                className="group hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                onClick={() => setSelectedProgram(program)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="bg-gray-100 rounded-2xl w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="h-8 w-8 text-gray-900" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">
                        {program.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {program.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Desktop Modal */}
      {isDesktop && selectedProgram && (
        <Dialog open={!!selectedProgram} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                {selectedProgram.icon && (
                  <selectedProgram.icon className="h-6 w-6" />
                )}
                {selectedProgram.title}
              </DialogTitle>
              <DialogDescription>
                {selectedProgram.description}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedProgram.content}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                Contact Us
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Bottom Sheet */}
      {!isDesktop && selectedProgram && (
        <Drawer open={!!selectedProgram} onOpenChange={handleClose}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-xl flex items-center gap-3">
                {selectedProgram.icon && (
                  <selectedProgram.icon className="h-5 w-5" />
                )}
                {selectedProgram.title}
              </DrawerTitle>
              <DrawerDescription>
                {selectedProgram.description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-8">
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {selectedProgram.content}
              </p>
              <div className="flex flex-col gap-3">
                <Button className="bg-gray-900 hover:bg-gray-800 text-white w-full">
                  Contact Us
                </Button>
                <Button variant="outline" onClick={handleClose} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
