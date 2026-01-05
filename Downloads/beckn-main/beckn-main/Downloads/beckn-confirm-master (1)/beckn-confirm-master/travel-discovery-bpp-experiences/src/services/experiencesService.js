const { v4: uuidv4 } = require('uuid');

/**
 * Experiences Service - Provides local experience catalog and booking services
 */
class ExperiencesService {

    constructor() {
        // Mock Data for Experiences
        this.experiences = [
            {
                id: 'exp-001',
                name: 'Mumbai Heritage Walk',
                short_desc: 'Guided walking tour of South Mumbai',
                long_desc: 'Explore the colonial architecture and heritage sites of South Mumbai with an expert guide.',
                city: 'Mumbai',
                price: '1500',
                duration: '3 hours',
                rating: 4.8,
                image: 'https://cdn.pixabay.com/photo/2017/02/10/12/12/temple-2055132_1280.jpg', // Used a generic temple image as placeholder
                location: 'Gateway of India',
                type: 'Activity'
            },
            {
                id: 'exp-002',
                name: 'Elephanta Caves Tour',
                short_desc: 'Ferry ride and caves exploration',
                long_desc: 'Visit the UNESCO World Heritage site of Elephanta Caves featuring ancient rock-cut sculptures.',
                city: 'Mumbai',
                price: '2500',
                duration: '5 hours',
                rating: 4.6,
                image: 'https://cdn.pixabay.com/photo/2014/09/11/09/49/elephanta-caves-441630_1280.jpg',
                location: 'Gateway of India',
                type: 'Tour'
            },
            {
                id: 'exp-003',
                name: 'Bollywood Studio Tour',
                short_desc: 'Behind the scenes of Bollywood',
                long_desc: 'Witness the magic of Indian cinema with a visit to a live shooting studio.',
                city: 'Mumbai',
                price: '3500',
                duration: '4 hours',
                rating: 4.5,
                image: 'https://cdn.pixabay.com/photo/2013/03/02/02/41/alley-89197_1280.jpg', // Generic placeholder
                location: 'Film City',
                type: 'Activity'
            },
            {
                id: 'exp-004',
                name: 'Old Delhi Food Walk',
                short_desc: 'Culinary journey through Chandni Chowk',
                long_desc: 'Taste the best street food of Old Delhi including Parathas, Chaat, and Kebabs.',
                city: 'Delhi',
                price: '2000',
                duration: '3 hours',
                rating: 4.9,
                image: 'https://cdn.pixabay.com/photo/2022/02/12/21/20/street-food-7010042_1280.jpg',
                location: 'Chandni Chowk',
                type: 'Food'
            },
            {
                id: 'exp-005',
                name: 'Cubbon Park Nature Walk',
                short_desc: 'Morning walk in the lung of the city',
                long_desc: 'Enjoy the lush greenery and colonial architecture within Bangalore\'s famous Cubbon Park.',
                city: 'Bangalore',
                price: '500',
                duration: '2 hours',
                rating: 4.7,
                image: 'https://cdn.pixabay.com/photo/2016/11/14/03/46/bangalore-1822557_1280.jpg',
                location: 'Cubbon Park',
                type: 'Activity'
            },
            {
                id: 'exp-006',
                name: 'Bangalore Palace Tour',
                short_desc: 'Royal history of the Wodeyars',
                long_desc: 'Explore the majestic Bangalore Palace, inspired by Windsor Castle.',
                city: 'Bangalore',
                price: '1200',
                duration: '3 hours',
                rating: 4.6,
                image: 'https://cdn.pixabay.com/photo/2018/01/14/16/09/bangalore-palace-3081979_1280.jpg',
                location: 'Vasanth Nagar',
                type: 'Tour'
            },
            {
                id: 'exp-007',
                name: 'Microbrewery Pub Crawl',
                short_desc: 'Experience the pub capital of India',
                long_desc: 'Visit the best microbreweries in Indiranagar and taste local craft beers.',
                city: 'Bangalore',
                price: '2500',
                duration: '4 hours',
                rating: 4.8,
                image: 'https://cdn.pixabay.com/photo/2016/11/21/13/04/beer-1845272_1280.jpg',
                location: 'Indiranagar',
                type: 'Food'
            }
        ];

        // In-memory storage for bookings
        this.bookings = [];
    }

    /**
     * Search for available experiences
     */
    async searchExperiences(location, date) {
        try {
            console.log(`🔍 Searching experiences near ${location} on ${date}`);

            // In a real app, we would query DB with location and date
            // For now, return all mock data matching city (simplified logic)
            // Default to Mumbai if no match found for demo
            // Filter by location (city) if provided
            let results = this.experiences;

            if (location) {
                const searchCity = location.trim().toLowerCase();
                // Map common codes to city names if needed
                const cityMap = {
                    'blr': 'bangalore',
                    'del': 'delhi',
                    'bom': 'mumbai',
                    'maa': 'chennai'
                };

                const targetCity = cityMap[searchCity] || searchCity;

                results = this.experiences.filter(exp =>
                    exp.city.toLowerCase().includes(targetCity) ||
                    targetCity.includes(exp.city.toLowerCase())
                );
            }

            console.log(`✅ Found ${results.length} experiences`);

            // Transform records to Beckn format
            const items = results.map(exp => {
                return {
                    id: exp.id,
                    descriptor: {
                        name: exp.name,
                        code: exp.id,
                        short_desc: exp.short_desc,
                        long_desc: exp.long_desc,
                        images: [{ url: exp.image }]
                    },
                    price: {
                        currency: "INR",
                        value: exp.price
                    },
                    category_id: "EXPERIENCE",
                    fulfillment_id: `fulfillment-${exp.id}`,
                    location_id: `location-${exp.city.toLowerCase()}`,
                    time: {
                        label: "duration",
                        duration: exp.duration
                    },
                    matched: true,
                    tags: [
                        {
                            code: "DETAILS",
                            list: [
                                { code: "TYPE", value: exp.type },
                                { code: "DURATION", value: exp.duration },
                                { code: "RATING", value: exp.rating.toString() }
                            ]
                        },
                        {
                            code: "LOCATION",
                            list: [
                                { code: "CITY", value: exp.city },
                                { code: "AREA", value: exp.location }
                            ]
                        }
                    ]
                };
            });

            // Create Beckn catalog structure
            const catalog = {
                descriptor: {
                    name: "Experiences BPP Provider",
                    short_desc: "Local experiences provider",
                    long_desc: "Curated local activities and tours"
                },
                providers: [
                    {
                        id: "experiences-provider-001",
                        descriptor: {
                            name: "Local Adventures",
                            short_desc: "Best local experiences",
                            long_desc: "Discover the city like a local"
                        },
                        categories: [
                            {
                                id: "EXPERIENCE",
                                descriptor: {
                                    name: "Local Experiences"
                                }
                            }
                        ],
                        items: items
                    }
                ]
            };

            return catalog;

        } catch (error) {
            console.error('❌ Error in experiences service:', error);
            throw error;
        }
    }

    async createBppBooking(bookingDetails) {
        console.log('📝 Creating BPP booking for experience:', bookingDetails);
        const booking = {
            ...bookingDetails,
            id: bookingDetails.bppBookingId,
            status: 'CONFIRMED',
            createdAt: new Date().toISOString()
        };
        this.bookings.push(booking);
        return booking;
    }

    async getBppBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        return booking;
    }

    async updateBookingForCancellation({ bppBookingId, cancellationReason, cancellationCharges, refundAmount }) {
        const index = this.bookings.findIndex(b => b.id === bppBookingId);
        if (index === -1) throw new Error('Booking not found');

        this.bookings[index] = {
            ...this.bookings[index],
            status: 'CANCELLED',
            cancellationReason,
            cancellationCharges,
            refundAmount,
            updatedAt: new Date().toISOString()
        };
        return this.bookings[index];
    }

}

module.exports = new ExperiencesService();
