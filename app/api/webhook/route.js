// app/api/webhook/route.js
import googleService from "@/lib/services/googleService";
import fs from "fs/promises";
import path from "path";

//Create the file path for the watched folders and file state

//Watcher folder stores the currently watched folders in the drive
const watchedFoldersFile = path.join(process.cwd(), "watched-folders.json");

//File state file stores the previous files in the watched folders
//CWD means current working directory
const fileStateFile = path.join(process.cwd(), "file-state.json");

async function loadWatchedFolders() {
  try {
    //uses fs's readFile method to read the watched folders file
    const data = await fs.readFile(watchedFoldersFile, "utf8");
    console.log("Loaded watched folders in webhook:", data);
    return JSON.parse(data);
  } catch (error) {
    console.log("No watched folders file found in webhook api");
    return {};
  }
}

async function loadPreviousFiles() {
  try {
    //uses fs's readFile method to read the file state file
    const data = await fs.readFile(fileStateFile, "utf8");
    console.log("Loaded previous files:", data);
    return JSON.parse(data);
  } catch (error) {
    console.log("No previous files file found, starting fresh");
    return {};
  }
}

async function saveCurrentFiles(files) {
  console.log("Saving current files:", files);
  //null, 2 are the replacer and spacers for JSON.stringify
  await fs.writeFile(fileStateFile, JSON.stringify(files, null, 2));
}

export async function POST(req) {
  try {
    //headers for the request to send
    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");
    const resourceId = req.headers.get("x-goog-resource-id");

    if (!channelId || !resourceState || !resourceId) {
      console.log("Missing required headers, assuming sync verification");
      return new Response(null, { status: 200 });
    }

    //init the google service from my googleService.js
    await googleService.init();

    const watchedFolders = await loadWatchedFolders();
    let previousFiles = await loadPreviousFiles();

    //COPILOT PROMPT: Create a folderId variable that finds the folder ID from the watchedFolders object
    //Use the channelId to find the folder ID from the watchedFolders object
    const folderId = Object.keys(watchedFolders).find(
      (id) => watchedFolders[id].channelId === channelId
    );

    //In nutshell if there is no folderID given, it will check all folders
    if (!folderId) {
      //Finds each folder ID from the watchedFolders object
      for (const folderId of Object.keys(watchedFolders)) {
        //Call the list of files in the folder
        const currentFiles = await googleService.listFolderFiles(folderId);
        console.log(`Current files in ${folderId}:`, currentFiles);

        //
        if (!previousFiles[folderId]) {
          previousFiles[folderId] = [];
        }

        //filter through the current files and compare them to the previous files
        const newFiles = currentFiles.filter(
          //if no previous files are found, then the current files are new
          (current) =>
            //.some() checks if one element passed the test in the function
            !previousFiles[folderId].some((prev) => prev.id === current.id)
        );
        if (newFiles.length > 0) {
          console.log(`New file(s) detected in folder ${folderId}!`);
          console.log("New files:", newFiles);
        }

        //Same setup as the new files, but this time it checks for deleted files
        const deletedFiles = previousFiles[folderId].filter(
          (prev) => !currentFiles.some((current) => current.id === prev.id)
        );
        if (deletedFiles.length > 0) {
          console.log(`File(s) deleted from folder ${folderId}!`);
          console.log("Deleted files:", deletedFiles);
        }

        if (newFiles.length === 0 && deletedFiles.length === 0) {
          console.log(`No changes detected in ${folderId}.`);
        }

        //Set the previous files to the current files
        previousFiles[folderId] = currentFiles;
      }
      await saveCurrentFiles(previousFiles);
    } else {
      console.log(`Processing webhook for folder: ${folderId}`);

      if (resourceState === "sync") {
        console.log(
          "Sync message received - webhook verified for folder:",
          folderId
        );
        previousFiles[folderId] = await googleService.listFolderFiles(folderId);
        await saveCurrentFiles(previousFiles);
        console.log(`Initial files in ${folderId}:`, previousFiles[folderId]);
      } else if (
        resourceState === "add" ||
        resourceState === "update" ||
        resourceState === "trash"
      ) {
        const currentFiles = await googleService.listFolderFiles(folderId);
        console.log(`Current files in ${folderId}:`, currentFiles);

        if (!previousFiles[folderId]) previousFiles[folderId] = [];

        // Detect new files
        const newFiles = currentFiles.filter(
          (current) =>
            !previousFiles[folderId].some((prev) => prev.id === current.id)
        );
        if (newFiles.length > 0) {
          console.log(`New file(s) detected in folder ${folderId}!`);
          console.log("New files:", newFiles);

          for (const file of newFiles) {
            if (
              file.mimeType === "application/pdf" ||
              file.name.toLowerCase().endsWith(".pdf")
            ) {
              try {
                console.log(`Auto-processing PDF: ${file.name} (${file.id})`);
                // Process the PDF with AlgoDocs
                fetch(
                  `${
                    process.env.NEXTAUTH_URL || "http://localhost:3000"
                  }/api/process-invoice`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      fileId: file.id,
                      fileName: file.name,
                    }),
                  }
                )
                  .then((response) => {
                    if (!response.ok) {
                      return response.text().then((text) => {
                        throw new Error(`Failed to process invoice: ${text}`);
                      });
                    }
                    return response.json();
                  })
                  .then((result) => {
                    console.log(
                      `Successfully initiated processing for ${file.name}, result:`,
                      result
                    );
                  })
                  .catch((error) => {
                    console.error(`Error processing ${file.name}:`, error);
                  });
              } catch (error) {
                console.error(
                  `Error initiating processing for ${file.name}:`,
                  error
                );
              }
            }
          }
        }

        // Detect deleted files
        const deletedFiles = previousFiles[folderId].filter(
          (prev) => !currentFiles.some((current) => current.id === prev.id)
        );
        if (deletedFiles.length > 0) {
          console.log(`File(s) deleted from folder ${folderId}!`);
          console.log("Deleted files:", deletedFiles);
        }

        if (newFiles.length === 0 && deletedFiles.length === 0) {
          console.log(`No changes detected in ${folderId}.`);
        }

        previousFiles[folderId] = currentFiles;
        await saveCurrentFiles(previousFiles);
      } else {
        console.log(`Unhandled resource state: ${resourceState}`);
      }
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
