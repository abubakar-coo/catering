import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Award, Users, Star } from 'lucide-react'
import Link from 'next/link'

const stats = [
  { icon: Users, value: '500+', label: 'Happy Customers' },
  { icon: Award, value: '50+', label: 'Events Hosted' },
  { icon: Star, value: '4.9', label: 'Average Rating' },
  { icon: Heart, value: '100%', label: 'Satisfaction Rate' },
]

export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              About Once Upon a Wedding
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              We are passionate about creating unforgettable experiences for your special occasions. 
              With years of expertise in catering and event management, we bring together the finest 
              cuisine, exceptional service, and magical moments that will last a lifetime.
            </p>
            <p className="text-lg text-gray-600 mb-8">
              Our team of dedicated professionals works tirelessly to ensure every detail is perfect, 
              from the initial planning to the final celebration. We believe that every event should 
              be unique and memorable.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="catering" size="lg" asChild>
                <Link href="/contact">
                  Get in Touch
                </Link>
              </Button>
              <Button variant="catering-outline" size="lg" asChild>
                <Link href="/about">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div>
            <Card className="p-8">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                  Our Achievements
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="mx-auto w-16 h-16 bg-catering-red/10 rounded-full flex items-center justify-center mb-4">
                        <stat.icon className="w-8 h-8 text-catering-red" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        {stat.value}
                      </div>
                      <div className="text-gray-600">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
