const axios = require('axios');

async function testBap() {
    try {
        console.log('Testing BAP Search Endpoint at port 8081...');
        const response = await axios.post('http://localhost:8081/beckn/search', {
            context: {
                domain: "mobility",
                action: "search",
                transaction_id: "test-txn",
                message_id: "test-msg"
            },
            message: {
                intent: {
                    category: {
                        id: "EXPERIENCE"
                    },
                    fulfillment: {
                        end: {
                            location: {
                                gps: "18.9220,72.8332"
                            }
                        }
                    }
                }
            }
        });

        console.log('Status:', response.status);
        const catalog = response.data?.message?.catalog;
        console.log('Providers count:', catalog?.providers?.length);
        if (catalog?.providers?.length === 0) {
            console.log('⚠️ No providers returned!');
        } else {
            console.log('✅ Providers found!');
            console.log(JSON.stringify(catalog.providers[0], null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testBap();
