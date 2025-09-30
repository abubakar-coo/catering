"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Calendar, MapPin, Clock, Star } from 'lucide-react'
import { TicketSelectionModal } from '@/components/modals/ticket-selection-modal'

export function HeroSection() {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-catering-red/20 via-transparent to-catering-gold/20" />
        <div className="absolute inset-0 bg-black/40" />
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/hero-bg.jpg')",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-catering-red/10 border border-catering-red/20 text-catering-red text-sm font-medium mb-8 animate-fade-in">
            <Star className="w-4 h-4 mr-2" />
            Premium Event Experience
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 animate-fade-in-up">
            <span className="block">Once Upon a</span>
            <span className="block catering-text-gradient">Wedding</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up">
            Experience the magic of premium catering and event management. 
            Book your tickets for our exclusive celebration event.
          </p>

          {/* Event Details Card */}
          <Card className="max-w-2xl mx-auto mb-12 bg-white/10 backdrop-blur-md border-white/20 animate-fade-in-up">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-white">
                <div className="flex items-center justify-center space-x-2">
                  <Calendar className="w-5 h-5 text-catering-gold" />
                  <div className="text-left">
                    <p className="text-sm text-gray-300">Date</p>
                    <p className="font-semibold">December 20, 2025</p>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="w-5 h-5 text-catering-gold" />
                  <div className="text-left">
                    <p className="text-sm text-gray-300">Time</p>
                    <p className="font-semibold">6:00 PM - 12:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <MapPin className="w-5 h-5 text-catering-gold" />
                  <div className="text-left">
                    <p className="text-sm text-gray-300">Location</p>
                    <p className="font-semibold">Lahore, Pakistan</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
            <Button
              size="xl"
              variant="catering"
              className="text-lg px-8 py-4 h-auto shadow-2xl hover:shadow-catering-shadow-lg transform hover:scale-105 transition-all duration-300"
              onClick={() => setIsTicketModalOpen(true)}
            >
              <Ticket className="w-5 h-5 mr-2" />
              Buy Tickets Now
            </Button>
            <Button
              size="xl"
              variant="catering-outline"
              className="text-lg px-8 py-4 h-auto border-2 text-white hover:text-catering-red hover:bg-white transition-all duration-300"
              asChild
            >
              <Link href="#about">
                Learn More
              </Link>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center animate-fade-in-up">
            <p className="text-gray-300 text-sm mb-4">
              Limited seats available • Early bird pricing available
            </p>
            <div className="flex items-center justify-center space-x-6 text-gray-400 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Live Music</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Premium Catering</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Free Parking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Selection Modal */}
      <TicketSelectionModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />
    </section>
  )
}
