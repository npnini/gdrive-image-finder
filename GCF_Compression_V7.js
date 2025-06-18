// index.js - Google Cloud Function


const { google } = require('googleapis');


/**
 * Responds to any HTTP request.
 *
 * @param {object} req HTTP request context.
 * @param {object} res HTTP response context.
 */
exports.findNewImages = async (req, res) => {
  // Set CORS headers for preflight requests
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }


  const { fromTimestamp, toTimestamp } = req.body;


  if (!fromTimestamp || !toTimestamp) {
    res.status(400).send('Missing "fromTimestamp" or "toTimestamp" in request body.');
    return;
  }


  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });


    // Query for image files modified within the given timestamp range.
    const query = `(mimeType contains 'image/') and (modifiedTime >= '${fromTimestamp}' and modifiedTime < '${toTimestamp}')`;


    const driveResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name, size, webViewLink)',
      pageSize: 1000, // Adjust as needed
      orderBy: 'modifiedTime desc',
    });


    const files = driveResponse.data.files;
    if (!files || files.length === 0) {
      res.status(200).json([]);
      return;
    }


    // Enhance file objects with the direct download URL.
    const fileList = files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      webViewLink: file.webViewLink,
      // This URL is needed by ImageKit to fetch the file directly.
      directDownloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`
    }));


    res.status(200).json(fileList);
  } catch (error) {
    console.error('Error executing Cloud Function:', error);
    res.status(500).send(`Error processing request: ${error.message}`);
  }
};


