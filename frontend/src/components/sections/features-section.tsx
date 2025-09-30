import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Utensils, Music, Camera, Gift, Shield, Clock } from 'lucide-react'

const features = [
  {
    icon: Utensils,
    title: 'Premium Catering',
    description: 'Exquisite cuisine prepared by our award-winning chefs using the finest ingredients.',
  },
  {
    icon: Music,
    title: 'Live Entertainment',
    description: 'Enjoy live music performances and entertainment throughout the evening.',
  },
  {
    icon: Camera,
    title: 'Professional Photography',
    description: 'Capture your special moments with our professional photography services.',
  },
  {
    icon: Gift,
    title: 'Welcome Gifts',
    description: 'Receive exclusive welcome gifts and keepsakes to remember the event.',
  },
  {
    icon: Shield,
    title: 'Secure & Safe',
    description: 'Your safety and security are our top priorities with professional security.',
  },
  {
    icon: Clock,
    title: 'Flexible Timing',
    description: 'Convenient timing options to fit your schedule and preferences.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Us?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We provide exceptional service and unforgettable experiences for your special occasions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            >
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-catering-red/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-catering-red group-hover:text-white transition-all duration-300">
                  <feature.icon className="w-8 h-8 text-catering-red group-hover:text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
