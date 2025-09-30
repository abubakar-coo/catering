"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface TicketType {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  isPopular?: boolean
}

interface TicketSelectionModalProps {
  isOpen: boolean
  onClose: () => void
}

const ticketTypes: TicketType[] = [
  {
    id: 'vip',
    name: 'VIP',
    price: 5000,
    description: 'Premium experience with exclusive amenities',
    features: ['Premium seating', 'Welcome drinks', 'Gift bag', 'Priority service'],
    isPopular: true,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 3000,
    description: 'Great value with all essential features',
    features: ['General seating', 'Welcome drinks', 'Event access'],
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    price: 2500,
    description: 'Limited time discount offer',
    features: ['General seating', 'Welcome drinks', 'Event access', 'Early bird discount'],
  },
]

export function TicketSelectionModal({ isOpen, onClose }: TicketSelectionModalProps) {
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const updateQuantity = (ticketId: string, change: number) => {
    setSelectedTickets(prev => {
      const current = prev[ticketId] || 0
      const newQuantity = Math.max(0, current + change)
      
      if (newQuantity === 0) {
        const { [ticketId]: _, ...rest } = prev
        return rest
      }
      
      return { ...prev, [ticketId]: newQuantity }
    })
  }

  const getTotalQuantity = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0)
  }

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((sum, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId)
      return sum + (ticket ? ticket.price * quantity : 0)
    }, 0)
  }

  const getSavings = () => {
    const totalQuantity = getTotalQuantity()
    if (totalQuantity >= 3) {
      return getTotalPrice() * 0.1 // 10% discount for 3+ tickets
    }
    return 0
  }

  const getFinalTotal = () => {
    return getTotalPrice() - getSavings()
  }

  const handleProceedToCheckout = () => {
    if (getTotalQuantity() === 0) return

    const ticketInfo = {
      tickets: Object.entries(selectedTickets).map(([ticketId, quantity]) => {
        const ticket = ticketTypes.find(t => t.id === ticketId)
        return {
          id: ticketId,
          name: ticket?.name || '',
          price: ticket?.price || 0,
          quantity,
        }
      }),
      totalQuantity: getTotalQuantity(),
      subtotal: getTotalPrice(),
      savings: getSavings(),
      total: getFinalTotal(),
    }

    // Store in localStorage and redirect to checkout
    localStorage.setItem('ticketInfo', JSON.stringify(ticketInfo))
    window.location.href = '/checkout'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-bounce-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Your Tickets</h2>
            <p className="text-gray-600">Choose your preferred ticket type and quantity</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Available Tickets</h3>
              {ticketTypes.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className={`relative transition-all duration-200 hover:shadow-lg ${
                    ticket.isPopular ? 'ring-2 ring-catering-red' : ''
                  }`}
                >
                  {ticket.isPopular && (
                    <div className="absolute -top-2 left-4 bg-catering-red text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{ticket.name}</CardTitle>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-catering-red">
                          {formatPrice(ticket.price)}
                        </div>
                        <div className="text-sm text-gray-500">per ticket</div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{ticket.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2 mb-4">
                      {ticket.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-catering-red rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Quantity</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => updateQuantity(ticket.id, -1)}
                          disabled={!selectedTickets[ticket.id]}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {selectedTickets[ticket.id] || 0}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => updateQuantity(ticket.id, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
              
              <Card>
                <CardContent className="p-6">
                  {getTotalQuantity() === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No tickets selected</p>
                      <p className="text-sm">Choose tickets to see your order summary</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selected Tickets */}
                      <div className="space-y-3">
                        {Object.entries(selectedTickets).map(([ticketId, quantity]) => {
                          const ticket = ticketTypes.find(t => t.id === ticketId)
                          if (!ticket || quantity === 0) return null
                          
                          return (
                            <div key={ticketId} className="flex justify-between items-center py-2 border-b border-gray-100">
                              <div>
                                <p className="font-medium">{ticket.name}</p>
                                <p className="text-sm text-gray-500">Qty: {quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatPrice(ticket.price * quantity)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Totals */}
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>{formatPrice(getTotalPrice())}</span>
                        </div>
                        {getSavings() > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Savings (10% off 3+ tickets)</span>
                            <span>-{formatPrice(getSavings())}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2">
                          <span>Total</span>
                          <span className="text-catering-red">{formatPrice(getFinalTotal())}</span>
                        </div>
                      </div>

                      {/* Proceed Button */}
                      <Button
                        className="w-full mt-6"
                        variant="catering"
                        size="lg"
                        onClick={handleProceedToCheckout}
                        disabled={isLoading}
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
