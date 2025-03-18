// app/api/start-watch/route.js
import { setupFolderWatches } from "@/lib/utils/webhookUtils";

export async function POST(req) {
  try {
    const { folderIds } = await req.json();

    console.log("folderids:", folderIds);

    const result = await setupFolderWatches(folderIds);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Folder watches started",
        watchInfos: result.watchInfos,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error starting watch:", error);
    return new Response(
      JSON.stringify({ error: `Failed to start watch: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
