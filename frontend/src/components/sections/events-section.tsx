import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react'
import Link from 'next/link'

const events = [
  {
    id: 1,
    title: 'Once Upon a Wedding',
    description: 'A magical evening of celebration, fine dining, and entertainment.',
    date: 'December 20, 2025',
    time: '6:00 PM - 12:00 AM',
    location: 'Lahore, Pakistan',
    image: '/images/event-1.jpg',
    price: 'From Rs. 2,500',
    isActive: true,
  },
  {
    id: 2,
    title: 'Spring Celebration',
    description: 'Welcome the spring season with our exclusive celebration event.',
    date: 'March 15, 2026',
    time: '7:00 PM - 11:00 PM',
    location: 'Karachi, Pakistan',
    image: '/images/event-2.jpg',
    price: 'From Rs. 3,000',
    isActive: false,
  },
  {
    id: 3,
    title: 'Summer Gala',
    description: 'An elegant summer gala with premium catering and live entertainment.',
    date: 'June 20, 2026',
    time: '6:30 PM - 12:30 AM',
    location: 'Islamabad, Pakistan',
    image: '/images/event-3.jpg',
    price: 'From Rs. 3,500',
    isActive: false,
  },
]

export function EventsSection() {
  return (
    <section id="events" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Our Events
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover our upcoming events and book your tickets for an unforgettable experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => (
            <Card 
              key={event.id} 
              className={`overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 ${
                event.isActive ? 'ring-2 ring-catering-red' : ''
              }`}
            >
              <div className="relative">
                <div 
                  className="h-48 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${event.image})`,
                  }}
                />
                {event.isActive && (
                  <div className="absolute top-4 left-4 bg-catering-red text-white px-3 py-1 rounded-full text-sm font-medium">
                    Available Now
                  </div>
                )}
                {!event.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">Coming Soon</span>
                  </div>
                )}
              </div>
              
              <CardHeader>
                <CardTitle className="text-xl">{event.title}</CardTitle>
                <CardDescription className="text-gray-600">
                  {event.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-catering-red" />
                    {event.date}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-catering-red" />
                    {event.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-catering-red" />
                    {event.location}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <span className="text-lg font-bold text-catering-red">
                    {event.price}
                  </span>
                  <Button 
                    variant={event.isActive ? "catering" : "outline"}
                    disabled={!event.isActive}
                    asChild
                  >
                    <Link href={event.isActive ? "/tickets" : "#"}>
                      <Ticket className="w-4 h-4 mr-2" />
                      {event.isActive ? "Book Now" : "Coming Soon"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
