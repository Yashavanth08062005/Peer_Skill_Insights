const experiencesService = require('../services/experiencesService');

class ExperiencesController {

    async search(req, res) {
        try {
            const { message } = req.body;
            // Extract location/date from intent
            const location = message?.intent?.fulfillment?.end?.location?.gps;
            const date = message?.intent?.fulfillment?.time?.range?.start;

            const catalog = await experiencesService.searchExperiences(location, date);

            return res.status(200).json({
                message: {
                    catalog: catalog
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Add other methods (select, init, confirm) as needed with basic mock responses
    async confirm(req, res) {
        // Return a mock confirmation
        return res.status(200).json({
            message: {
                order: {
                    id: `ord_${Date.now()}`,
                    state: 'CONFIRMED',
                    items: req.body.message.order.items
                }
            }
        });
    }
}

module.exports = new ExperiencesController();
