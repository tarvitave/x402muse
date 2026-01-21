const axios = require('axios');

async function check() {
    try {
        const response = await axios.get('https://api.artic.edu/api/v1/artworks/search', {
            params: {
                q: 'The Family Concert',
                fields: 'id,title,image_id'
            }
        });
        
        console.log('Results found:', response.data.data.length);
        
        for (const item of response.data.data) {
            console.log('---');
            console.log('Title:', item.title);
            console.log('ID:', item.id);
            console.log('Image ID:', item.image_id);
            const url = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;
            console.log('Generated URL:', url);
            try {
                const imgRes = await axios.head(url);
                console.log('Image Status:', imgRes.status);
            } catch (err) {
                console.log('Image Status: FAILED', err.response ? err.response.status : err.message);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

check();
