// netlify/functions/getMovie.js

exports.handler = async function(event, context) {
  // Frontend theke pathano Movie ID ta dhora
  const tmdbId = event.queryStringParameters.id;

  if (!tmdbId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, error: "Movie ID is missing!" })
    };
  }

  try {
    /* 
      🔥 THE SCRAPING ENGINE 🔥
      Ekhane ashol magic ta hobe. Amra third-party theke raw link extract korbo.
      Bortomane Netlify test korar jonno ekta demo HLS (.m3u8) link pathacchi.
      Frontend connect hoye gele ekhane amra Vidsrc/Onno API er scraping logic boshabo.
    */
    
    // Demo HLS Raw Link (This will be replaced by scraped TMDB movie link later)
    const scrapedRawLink = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; 
    const downloadLink = "https://www.w3schools.com/html/mov_bbb.mp4"; // Dummy download

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        tmdbId: tmdbId,
        streamUrl: scrapedRawLink,
        downloadUrl: downloadLink,
        type: "hls" // m3u8 format
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, error: "Scraping failed!" })
    };
  }
};
