const axios = require('axios');

async function testBpp() {
    try {
        console.log('Testing Experiences BPP at port 3006...');
        const response = await axios.post('http://localhost:3006/search', {
            context: {
                domain: "mobility",
                action: "search",
                transaction_id: "test-txn",
                message_id: "test-msg"
            },
            message: {
                intent: {
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
        console.log('Response:', JSON.stringify(response.data, null, 2));

        const providers = response.data?.message?.catalog?.providers;
        console.log('Providers count:', providers?.length);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testBpp();
