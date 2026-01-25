> ## Documentation Index
> Fetch the complete documentation index at: https://documentation.api.odyssey.ml/llms.txt
> Use this file to discover all available pages before exploring further.

# Simulate API

> Run scripted video generation asynchronously with the Simulate API.

<Info>
  The Simulate API requires SDK version 1.0.0 or higher.
</Info>

The Simulate API allows you to run scripted interactions asynchronously. Unlike the Interactive API where you connect and interact in real-time, simulations execute in the background and produce recordings you can retrieve when complete.

## When to Use the Simulate API

| Use Case                 | Recommended Approach                            |
| ------------------------ | ----------------------------------------------- |
| Real-time interaction    | Interactive API (`connect()` + `startStream()`) |
| Batch video generation   | Simulate API                                    |
| Pre-scripted sequences   | Simulate API                                    |
| Background processing    | Simulate API                                    |
| User-driven interactions | Interactive API                                 |

## Script Format

A simulation script is an array of entries that define the sequence of actions using timestamps:

```typescript  theme={null}
interface ScriptEntry {
  timestamp_ms: number;           // When this action occurs (milliseconds from start)
  start?: {                       // Begin a new stream
    prompt: string;
    image?: File | Blob | string; // Optional image for image-to-video
  };
  interact?: {                    // Send an interaction
    prompt: string;
  };
  end?: Record<string, never>;    // End the stream (empty object)
}
```

### Entry Types

| Action     | Fields               | Description                            |
| ---------- | -------------------- | -------------------------------------- |
| `start`    | `{ prompt, image? }` | Begin a new stream with initial prompt |
| `interact` | `{ prompt }`         | Send an interaction prompt             |
| `end`      | `{}`                 | End the current stream                 |

### Example Script

```typescript  theme={null}
const script = [
  // Start a portrait video of a cat at t=0
  { timestamp_ms: 0, start: { prompt: 'A cat sitting by a window' } },

  // Interact at t=3000ms (3 seconds)
  { timestamp_ms: 3000, interact: { prompt: 'The cat looks outside' } },

  // Another interaction at t=6000ms (6 seconds)
  { timestamp_ms: 6000, interact: { prompt: 'The cat stretches' } },

  // End the stream at t=9000ms (9 seconds)
  { timestamp_ms: 9000, end: {} }
];
```

## Basic Workflow

### 1. Create a Simulation

```typescript  theme={null}
import { Odyssey } from '@odysseyml/odyssey';

const client = new Odyssey({ apiKey: 'ody_your_api_key_here' });

const job = await client.simulate({
  script: [
    { timestamp_ms: 0, start: { prompt: 'A serene mountain landscape' } },
    { timestamp_ms: 5000, interact: { prompt: 'Clouds roll across the sky' } },
    { timestamp_ms: 10000, interact: { prompt: 'The sun begins to set' } },
    { timestamp_ms: 15000, end: {} }
  ],
  portrait: false
});

console.log('Simulation ID:', job.job_id);
console.log('Status:', job.status); // 'pending'
```

### 2. Poll for Completion

```typescript  theme={null}
async function waitForCompletion(client, jobId) {
  while (true) {
    const status = await client.getSimulateStatus(jobId);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(`Simulation failed: ${status.error_message}`);
    }

    if (status.status === 'cancelled') {
      throw new Error('Simulation was cancelled');
    }

    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

const result = await waitForCompletion(client, job.job_id);
console.log('Simulation completed!');
```

### 3. Retrieve Recordings

```typescript  theme={null}
// Get the stream IDs from the completed simulation
for (const stream of result.streams) {
  const recording = await client.getRecording(stream.stream_id);
  console.log('Video URL:', recording.video_url);
  console.log('Duration:', recording.duration_seconds, 'seconds');
}
```

## Image-to-Video with the Simulate API

You can start a simulation with an image:

```typescript  theme={null}
const imageFile = document.querySelector('input[type="file"]').files[0];

const job = await client.simulate({
  script: [
    {
      timestamp_ms: 0,
      start: {
        prompt: 'A cat',
        image: imageFile
      }
    },
    { timestamp_ms: 3000, interact: { prompt: 'The cat looks around' } },
    { timestamp_ms: 6000, end: {} }
  ],
  portrait: false
});
```

You can also use a base64 data URL string:

```typescript  theme={null}
const job = await client.simulate({
  script: [
    {
      timestamp_ms: 0,
      start: {
        prompt: 'Robot dancing',
        image: 'data:image/png;base64,iVBORw0KGgo...'
      }
    },
    { timestamp_ms: 10000, end: {} }
  ]
});
```

## Managing Simulation Jobs

### List Your Simulation Jobs

```typescript  theme={null}
const { jobs, total } = await client.listSimulations({ limit: 10 });

for (const sim of jobs) {
  console.log(`${sim.job_id}: ${sim.status} (created: ${sim.created_at})`);
}

console.log(`Showing ${jobs.length} of ${total} total simulations`);
```

### Cancel a Simulation

```typescript  theme={null}
// Cancel a pending or running simulation
await client.cancelSimulation(job.job_id);
console.log('Simulation cancelled');
```

## Complete Example

```typescript  theme={null}
import { Odyssey } from '@odysseyml/odyssey';

async function runSimulation() {
  const client = new Odyssey({ apiKey: 'ody_your_api_key_here' });

  // Create simulation
  const job = await client.simulate({
    script: [
      { timestamp_ms: 0, start: { prompt: 'A cat sitting on a windowsill' } },
      { timestamp_ms: 3000, interact: { prompt: 'The cat watches a bird outside' } },
      { timestamp_ms: 6000, interact: { prompt: 'The cat stretches lazily' } },
      { timestamp_ms: 9000, interact: { prompt: 'The cat curls up to sleep' } },
      { timestamp_ms: 12000, end: {} }
    ],
    portrait: true
  });

  console.log('Started simulation:', job.job_id);

  // Poll for completion
  let status;
  do {
    await new Promise(resolve => setTimeout(resolve, 5000));
    status = await client.getSimulateStatus(job.job_id);
    console.log('Status:', status.status);
  } while (status.status === 'pending' || status.status === 'running');

  if (status.status === 'completed') {
    // Download recordings
    for (const stream of status.streams) {
      const recording = await client.getRecording(stream.stream_id);
      console.log('Recording ready:', recording.video_url);
    }
  } else {
    console.error('Simulation failed:', status.error_message);
  }
}

runSimulation();
```

## Error Handling

```typescript  theme={null}
try {
  const job = await client.simulate({
    script: [
      { timestamp_ms: 0, start: { prompt: 'A sunset over the ocean' } },
      { timestamp_ms: 5000, end: {} }
    ]
  });

  const status = await client.getSimulateStatus(job.job_id);

  if (status.status === 'failed') {
    console.error('Job failed:', status.error_message);

    // Check individual streams for errors
    for (const stream of status.streams) {
      if (stream.status === 'failed') {
        console.error(`Stream ${stream.stream_id} failed:`, stream.error_message);
      }
    }
  }
} catch (error) {
  console.error('API error:', error.message);
}
> ## Documentation Index
> Fetch the complete documentation index at: https://documentation.api.odyssey.ml/llms.txt
> Use this file to discover all available pages before exploring further.

# Recordings

> Working with stream recordings in the Odyssey client.

<Info>
  Recording features require v1.0.0 or later.
</Info>

After a stream session ends, you can retrieve recording artifacts including the full video, events log, thumbnail, and preview.

## Capturing the Stream ID

The stream ID is provided in the `onStreamStarted` callback. Save this ID to retrieve recordings later:

```typescript  theme={null}
import { Odyssey } from '@odysseyml/odyssey';

const client = new Odyssey({ apiKey: 'ody_your_api_key_here' });

let currentStreamId: string | null = null;

const connected = await client.connect({
  onConnected: (mediaStream) => {
    videoElement.srcObject = mediaStream;
  },
  onStreamStarted: (streamId) => {
    // Save the stream ID for later recording retrieval
    currentStreamId = streamId;
    console.log('Stream started:', streamId);
  },
});

if (connected) {
  await client.startStream({ prompt: 'A cat' });
  // ... interact with the stream ...
  await client.endStream();
}
client.disconnect();
```

## Retrieving a Recording

Use `getRecording()` with the stream ID to get presigned URLs for the recording artifacts:

```typescript  theme={null}
if (currentStreamId) {
  const recording = await client.getRecording(currentStreamId);

  if (recording.video_url) {
    // Play back the recorded video
    const playbackVideo = document.getElementById('playback') as HTMLVideoElement;
    playbackVideo.src = recording.video_url;
  }

  if (recording.events_url) {
    // Fetch and parse the events log (JSONL format)
    const response = await fetch(recording.events_url);
    const text = await response.text();
    const events = text.trim().split('\n').map(line => JSON.parse(line));
    console.log('Session events:', events);
  }

  console.log('Duration:', recording.duration_seconds, 'seconds');
  console.log('Frames:', recording.frame_count);
}
```

<Note>
  `getRecording()` can be called without an active connection. It only requires a valid API key.
</Note>

### Recording Properties

| Property           | Type     | Description   |                                        |
| ------------------ | -------- | ------------- | -------------------------------------- |
| `stream_id`        | `string` | The stream ID |                                        |
| `video_url`        | \`string | null\`        | Presigned URL for full recording (MP4) |
| `events_url`       | \`string | null\`        | Presigned URL for events log (JSONL)   |
| `thumbnail_url`    | \`string | null\`        | Presigned URL for thumbnail (JPEG)     |
| `preview_url`      | \`string | null\`        | Presigned URL for preview video (MP4)  |
| `frame_count`      | \`number | null\`        | Total frames in recording              |
| `duration_seconds` | \`number | null\`        | Recording duration in seconds          |

<Note>
  URLs are valid for a limited time (typically 1 hour).
</Note>

## Listing All Recordings

Use `listStreamRecordings()` to get a paginated list of all your recordings:

```typescript  theme={null}
// Get recent recordings
const { recordings, total } = await client.listStreamRecordings({ limit: 10 });
console.log(`Found ${total} recordings`);

for (const rec of recordings) {
  console.log(`Stream ${rec.stream_id}: ${rec.duration_seconds}s at ${rec.width}x${rec.height}`);
}

// Paginate through results
const page2 = await client.listStreamRecordings({ limit: 10, offset: 10 });
```

### Pagination Options

| Option   | Type     | Default | Description                            |
| -------- | -------- | ------- | -------------------------------------- |
| `limit`  | `number` | `50`    | Maximum recordings to return (max 100) |
| `offset` | `number` | `0`     | Number of recordings to skip           |

## React Example

```tsx  theme={null}
import { useOdyssey } from '@odysseyml/odyssey/react';
import { useState } from 'react';

function RecordingsViewer() {
  const odyssey = useOdyssey({ apiKey: 'ody_your_api_key_here' });
  const [recordings, setRecordings] = useState([]);

  const loadRecordings = async () => {
    const result = await odyssey.listStreamRecordings({ limit: 20 });
    setRecordings(result.recordings);
  };

  const playRecording = async (streamId: string) => {
    const recording = await odyssey.getRecording(streamId);
    if (recording.video_url) {
      window.open(recording.video_url, '_blank');
    }
  };

  return (
    <div>
      <button onClick={loadRecordings}>Load My Recordings</button>
      <ul>
        {recordings.map((rec) => (
          <li key={rec.stream_id}>
            {rec.stream_id} - {rec.duration_seconds}s
            <button onClick={() => playRecording(rec.stream_id)}>Play</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Complete Workflow Example

This example shows the full workflow: starting a stream, interacting with it, ending it, and then retrieving the recording:

```typescript  theme={null}
import { Odyssey } from '@odysseyml/odyssey';

const client = new Odyssey({ apiKey: 'ody_your_api_key_here' });

let currentStreamId: string | null = null;

const connected = await client.connect({
  onConnected: (mediaStream) => {
    videoElement.srcObject = mediaStream;
  },
  onStreamStarted: (streamId) => {
    currentStreamId = streamId;
    console.log('Stream started:', streamId);
  },
});

if (connected) {
  // Start an interactive stream
  await client.startStream({ prompt: 'A cat sitting on a windowsill', portrait: true });

  // Send some interactions
  await client.interact({ prompt: 'The cat stretches and yawns' });
  await client.interact({ prompt: 'The cat looks outside at birds' });

  // End the stream
  await client.endStream();
}

client.disconnect();

// Retrieve the recording
if (currentStreamId) {
  const recording = await client.getRecording(currentStreamId);

  if (recording.video_url) {
    console.log('Recording available at:', recording.video_url);
    console.log('Duration:', recording.duration_seconds, 'seconds');
  }
}
```

## Related

<CardGroup cols={2}>
  <Card title="Recording Types" icon="code" href="/sdk/javascript/types#recording-types">
    TypeScript interfaces for recordings
  </Card>

  <Card title="Odyssey Class" icon="cube" href="/sdk/javascript/odyssey-class#getrecording">
    getRecording and listStreamRecordings methods
  </Card>
</CardGroup>

> ## Documentation Index
> Fetch the complete documentation index at: https://documentation.api.odyssey.ml/llms.txt
> Use this file to discover all available pages before exploring further.

# Odyssey Class

> Main client class for interacting with Odyssey's audio-visual intelligence.

The main client class for connecting to Odyssey's audio-visual intelligence platform.

## Constructor

```typescript  theme={null}
constructor(config: ClientConfig)
```

Creates a new Odyssey client instance with the provided API key.

| Parameter | Type                                                 | Description                |
| --------- | ---------------------------------------------------- | -------------------------- |
| `config`  | [`ClientConfig`](/sdk/javascript/types#clientconfig) | Configuration with API key |

```typescript  theme={null}
import { Odyssey } from '@odysseyml/odyssey';

const client = new Odyssey({ apiKey: 'ody_your_api_key_here' });
```

## Methods

### connect()

Connect to a streaming session. The Odyssey API automatically assigns an available session.

```typescript  theme={null}
async connect(handlers?: OdysseyEventHandlers): Promise<MediaStream>
```

| Parameter  | Type                                                                 | Description                                |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `handlers` | [`OdysseyEventHandlers`](/sdk/javascript/types#odysseyeventhandlers) | Optional event handlers for callback style |

**Returns:** `Promise<MediaStream>` - Resolves with the MediaStream when the connection is fully ready (including data channel). You can call `startStream()` immediately after this resolves.

<Info>
  The `connect()` method supports two usage patterns: **Await Style** for sequential code, and **Callback Style** for event-driven code. Both patterns wait for the data channel to be ready before proceeding.
</Info>

<CodeGroup>
  ```typescript Await Style theme={null}
  // Await style - use when you want sequential, Promise-based code
  const mediaStream = await client.connect();
  videoElement.srcObject = mediaStream;

  // Connection is fully ready - no delay needed!
  await client.startStream({ prompt: 'A cat' });
  await client.interact({ prompt: 'Pet the cat' });
  ```

  ```typescript Callback Style theme={null}
  // Callback style - use for event-driven code
  client.connect({
    onConnected: (mediaStream) => {
      videoElement.srcObject = mediaStream;
      // Connection is fully ready - can call startStream immediately
      client.startStream({ prompt: 'A cat' });
    },
    onStreamStarted: (streamId) => {
      console.log('Stream ready:', streamId);
      client.interact({ prompt: 'Pet the cat' });
    },
    onStreamEnded: () => {
      console.log('Stream ended');
    },
    onDisconnected: () => {
      console.log('Disconnected');
    },
    onStatusChange: (status, message) => {
      console.log('Status:', status, message);
    },
    onError: (error, fatal) => {
      console.error('Error:', error.message, 'Fatal:', fatal);
    },
  });
  ```
</CodeGroup>

#### When to use each style

| Style        | Best for                                                                      |
| ------------ | ----------------------------------------------------------------------------- |
| **Await**    | Sequential operations, simpler code flow, when you control the timing         |
| **Callback** | UI-driven interactions, reactive patterns, when you need to respond to events |

<Warning>
  Both styles properly wait for the data channel to be ready. You do **not** need to add any artificial delays between `connect()` and `startStream()`.
</Warning>

### disconnect()

Disconnect from the session and clean up resources.

```typescript  theme={null}
disconnect(): void
```

```typescript  theme={null}
client.disconnect();
```

### startStream()

Start an interactive stream session.

```typescript  theme={null}
startStream(options?: StartStreamOptions): Promise<string>
```

| Option     | Type      | Default | Description                                                                                     |                                              |
| ---------- | --------- | ------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `prompt`   | `string`  | `''`    | Initial prompt to generate video content                                                        |                                              |
| `portrait` | `boolean` | `true`  | `true` for portrait (704x1280), `false` for landscape (1280x704). Resolution may vary by model. |                                              |
| `image`    | \`File    | Blob\`  | —                                                                                               | Optional image for image-to-video generation |

**Returns:** `Promise<string>` - Resolves with the stream ID when the stream is ready. Use this ID to retrieve recordings.

```typescript  theme={null}
const streamId = await client.startStream({ prompt: 'A cat', portrait: true });
console.log('Stream started:', streamId);
```

<Info>
  **Image-to-video requirements:**

  * SDK version 1.0.0+
  * Max size: 25MB
  * Supported formats: JPEG, PNG, WebP, GIF, BMP, HEIC, HEIF, AVIF
  * Images are resized to 1280x704 (landscape) or 704x1280 (portrait)
</Info>

```typescript  theme={null}
// Image-to-video example
const mediaStream = await client.connect();
const imageFile = fileInput.files[0];
const streamId = await client.startStream({
  prompt: 'A cat',
  portrait: false,
  image: imageFile
});
```

### interact()

Send an interaction prompt to update the video content.

```typescript  theme={null}
interact(options: InteractOptions): Promise<string>
```

| Option   | Type     | Description            |
| -------- | -------- | ---------------------- |
| `prompt` | `string` | The interaction prompt |

**Returns:** `Promise<string>` - Resolves with the acknowledged prompt when processed.

```typescript  theme={null}
const ackPrompt = await client.interact({ prompt: 'Pet the cat' });
console.log('Interaction acknowledged:', ackPrompt);
```

### endStream()

End the current interactive stream session.

```typescript  theme={null}
endStream(): Promise<void>
```

**Returns:** `Promise<void>` - Resolves when the stream has ended.

```typescript  theme={null}
await client.endStream();
```

### attachToVideo()

Attach the media stream to a video element.

```typescript  theme={null}
attachToVideo(videoElement: HTMLVideoElement | null): HTMLVideoElement | null
```

|                | Parameter          | Type   | Description                               |
| -------------- | ------------------ | ------ | ----------------------------------------- |
| `videoElement` | \`HTMLVideoElement | null\` | The video element to attach the stream to |

**Returns:** The video element for chaining, or `null` if no element provided.

```typescript  theme={null}
const videoEl = document.querySelector('video');
client.attachToVideo(videoEl);
```

### getRecording()

<Info>
  Added in v1.0.0
</Info>

Get recording URLs for a completed stream.

```typescript  theme={null}
getRecording(streamId: string): Promise<Recording>
```

| Parameter  | Type     | Description                        |
| ---------- | -------- | ---------------------------------- |
| `streamId` | `string` | The stream ID to get recording for |

**Returns:** `Promise<Recording>` - Recording data with presigned URLs.

```typescript  theme={null}
const recording = await client.getRecording('abc-123-def');
console.log('Video URL:', recording.video_url);
console.log('Duration:', recording.duration_seconds, 'seconds');
```

### listStreamRecordings()

<Info>
  Added in v1.0.0
</Info>

List the user's stream recordings. Only returns streams that have recordings.

```typescript  theme={null}
listStreamRecordings(options?: ListStreamRecordingsOptions): Promise<StreamRecordingsListResponse>
```

| Parameter | Type                                                                               | Description                 |
| --------- | ---------------------------------------------------------------------------------- | --------------------------- |
| `options` | [`ListStreamRecordingsOptions`](/sdk/javascript/types#liststreamrecordingsoptions) | Optional pagination options |

**Returns:** `Promise<StreamRecordingsListResponse>` - Paginated list of stream recordings.

```typescript  theme={null}
// Get recent recordings
const { recordings, total } = await client.listStreamRecordings({ limit: 20 });

// Paginate
const page2 = await client.listStreamRecordings({ limit: 20, offset: 20 });
```

## Simulate API Methods

<Info>
  Simulate API methods were added in v1.0.0
</Info>

The Simulate API allows you to run scripted interactions asynchronously. Unlike the Interactive API, simulations execute in the background and produce recordings you can retrieve when complete.

### simulate()

Create a new simulation job.

```typescript  theme={null}
simulate(options: SimulateOptions): Promise<SimulationJob>
```

| Parameter | Type                                                       | Description                    |
| --------- | ---------------------------------------------------------- | ------------------------------ |
| `options` | [`SimulateOptions`](/sdk/javascript/types#simulateoptions) | Simulation options with script |

**Returns:** `Promise<SimulationJob>` - The created simulation job with ID and initial status.

```typescript  theme={null}
const job = await client.simulate({
  script: [
    { timestamp_ms: 0, start: { prompt: 'A cat sitting on a windowsill' } },
    { timestamp_ms: 3000, interact: { prompt: 'The cat stretches' } },
    { timestamp_ms: 6000, interact: { prompt: 'The cat yawns' } },
    { timestamp_ms: 9000, end: {} }
  ],
  portrait: true
});
console.log('Simulation started:', job.job_id);
```

### getSimulateStatus()

Get the current status of a simulation job.

```typescript  theme={null}
getSimulateStatus(simulationId: string): Promise<SimulationJobDetail>
```

| Parameter      | Type     | Description                |
| -------------- | -------- | -------------------------- |
| `simulationId` | `string` | The simulation ID to check |

**Returns:** `Promise<SimulationJobDetail>` - Detailed status including streams created.

```typescript  theme={null}
const status = await client.getSimulateStatus(job.job_id);
console.log('Status:', status.status);
if (status.status === 'completed') {
  for (const stream of status.streams) {
    console.log('Stream:', stream.stream_id);
  }
}
```

### listSimulations()

List simulation jobs for the authenticated user.

```typescript  theme={null}
listSimulations(options?: ListSimulationsOptions): Promise<SimulationJobsList>
```

| Parameter | Type                                                                     | Description                 |
| --------- | ------------------------------------------------------------------------ | --------------------------- |
| `options` | [`ListSimulationsOptions`](/sdk/javascript/types#listsimulationsoptions) | Optional pagination options |

**Returns:** `Promise<SimulationJobsList>` - Paginated list of simulation jobs.

```typescript  theme={null}
const { jobs, total } = await client.listSimulations({ limit: 10 });
for (const sim of jobs) {
  console.log(`${sim.job_id}: ${sim.status}`);
}
```

### cancelSimulation()

Cancel a pending or running simulation job.

```typescript  theme={null}
cancelSimulation(simulationId: string): Promise<void>
```

| Parameter      | Type     | Description                 |
| -------------- | -------- | --------------------------- |
| `simulationId` | `string` | The simulation ID to cancel |

**Returns:** `Promise<void>` - Resolves when cancelled.

```typescript  theme={null}
await client.cancelSimulation(job.job_id);
console.log('Simulation cancelled');
```

<Note>
  Simulation methods can be called without an active connection. They only require a valid API key.
</Note>

## Properties

### isConnected

```typescript  theme={null}
get isConnected(): boolean
```

Whether the client is currently connected and ready.

### currentStatus

```typescript  theme={null}
get currentStatus(): ConnectionStatus
```

Current connection status.

**Possible values:** `'authenticating'` | `'connecting'` | `'reconnecting'` | `'connected'` | `'disconnected'` | `'failed'`

### currentSessionId

```typescript  theme={null}
get currentSessionId(): string | null
```

Current session ID, or `null` if not connected.

### mediaStream

```typescript  theme={null}
get mediaStream(): MediaStream | null
```

Current media stream containing video track from the streamer.

### connectionState

```typescript  theme={null}
get connectionState(): RTCPeerConnectionState | null
```

Current WebRTC peer connection state.

**Possible values:** `'new'` | `'connecting'` | `'connected'` | `'disconnected'` | `'failed'` | `'closed'` | `null`

### iceConnectionState

```typescript  theme={null}
get iceConnectionState(): RTCIceConnectionState | null
```

Current ICE connection state.

**Possible values:** `'new'` | `'checking'` | `'connected'` | `'completed'` | `'failed'` | `'disconnected'` | `'closed'` | `null`
> ## Documentation Index
> Fetch the complete documentation index at: https://documentation.api.odyssey.ml/llms.txt
> Use this file to discover all available pages before exploring further.

# React Hook

> useOdyssey hook for managing Odyssey client lifecycle in React.

The `useOdyssey` hook provides a convenient way to manage the Odyssey client lifecycle and state in React applications.

## Usage

```typescript  theme={null}
import { useOdyssey } from '@odysseyml/odyssey/react';

function useOdyssey(options: UseOdysseyOptions): OdysseyClient
```

## Parameters

| Parameter          | Type                                                             | Required | Description          |
| ------------------ | ---------------------------------------------------------------- | -------- | -------------------- |
| `options.apiKey`   | `string`                                                         | Yes      | Your Odyssey API key |
| `options.handlers` | [`UseOdysseyHandlers`](/sdk/javascript/types#useodysseyhandlers) | No       | Event handlers       |

## Return Value

The hook returns an `OdysseyClient` object with the following properties and methods:

### Methods

| Method          | Type                                                         | Description                                                                  |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `connect`       | `() => Promise<MediaStream>`                                 | Connect to a session (returns MediaStream when connected, throws on failure) |
| `disconnect`    | `() => void`                                                 | Disconnect from current session                                              |
| `startStream`   | `(options?: StartStreamOptions) => Promise<string>`          | Start interactive stream                                                     |
| `interact`      | `(options: InteractOptions) => Promise<string>`              | Send interaction prompt                                                      |
| `endStream`     | `() => Promise<void>`                                        | End current stream                                                           |
| `attachToVideo` | `(el: HTMLVideoElement \| null) => HTMLVideoElement \| null` | Attach stream to video element                                               |

### State

| Property      | Type                                                         | Description                 |
| ------------- | ------------------------------------------------------------ | --------------------------- |
| `status`      | [`ConnectionStatus`](/sdk/javascript/types#connectionstatus) | Current connection status   |
| `error`       | `string \| null`                                             | Current error message       |
| `isConnected` | `boolean`                                                    | Whether connected and ready |
| `mediaStream` | `MediaStream \| null`                                        | Video/audio stream          |
| `sessionId`   | `string \| null`                                             | Current session ID          |

## Basic Example

```tsx  theme={null}
import { useOdyssey } from '@odysseyml/odyssey/react';
import { useEffect, useRef } from 'react';

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const odyssey = useOdyssey({
    apiKey: 'ody_your_api_key_here',
    handlers: {
      onConnected: (mediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      },
      onError: (error, fatal) => {
        console.error('Error:', error.message, 'Fatal:', fatal);
      },
      onStreamStarted: (id) => console.log('Started:', id),
      onInteractAcknowledged: (prompt) => console.log('Ack:', prompt),
    },
  });

  useEffect(() => {
    odyssey.connect()
      .then(stream => console.log('Connected with stream:', stream.id))
      .catch(err => console.error('Connection failed:', err.message));
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted />
      <p>Status: {odyssey.status}</p>
      {odyssey.error && <p>Error: {odyssey.error}</p>}
      <button onClick={() => odyssey.startStream({ prompt: 'A cat' })}>
        Start
      </button>
      <button onClick={() => odyssey.interact({ prompt: 'Pet the cat' })}>
        Interact
      </button>
    </div>
  );
}
```

## Complete Example

```tsx  theme={null}
import { useEffect, useRef, useState } from 'react';
import { useOdyssey } from '@odysseyml/odyssey/react';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prompt, setPrompt] = useState('');

  const odyssey = useOdyssey({
    apiKey: 'ody_your_api_key_here',
    handlers: {
      onConnected: (mediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      },
      onDisconnected: () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      },
      onError: (error, fatal) => {
        console.error('Error:', error.message, 'Fatal:', fatal);
      },
      onStreamStarted: (streamId) => {
        console.log('Stream started:', streamId);
      },
      onInteractAcknowledged: (ackPrompt) => {
        console.log('Interaction acknowledged:', ackPrompt);
      },
      onStreamError: (reason, message) => {
        console.error('Stream error:', reason, message);
      },
    },
  });

  useEffect(() => {
    odyssey.connect()
      .then(stream => console.log('Connected with stream:', stream.id))
      .catch(err => console.error('Connection failed:', err.message));
    return () => odyssey.disconnect();
  }, []);

  const handleStart = async () => {
    await odyssey.startStream({ prompt: 'A cat', portrait: true });
  };

  const handleInteract = async () => {
    if (prompt.trim()) {
      await odyssey.interact({ prompt });
      setPrompt('');
    }
  };

  const handleEnd = async () => {
    await odyssey.endStream();
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted />

      <div>
        <p>Status: {odyssey.status}</p>
        {odyssey.error && <p style={{ color: 'red' }}>{odyssey.error}</p>}
      </div>

      <div>
        <button onClick={handleStart} disabled={!odyssey.isConnected}>
          Start Stream
        </button>

        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter interaction prompt..."
        />
        <button onClick={handleInteract} disabled={!odyssey.isConnected}>
          Send
        </button>

        <button onClick={handleEnd} disabled={!odyssey.isConnected}>
          End Stream
        </button>
      </div>
    </div>
  );
}
```

## Tips

<Note>
  The hook automatically manages cleanup when the component unmounts, but it's good practice to explicitly call `disconnect()` in your cleanup function.
</Note>

* Always call `connect()` in a `useEffect` hook
* Use the returned `status` and `error` properties to show connection state to users
* The `isConnected` property is useful for disabling buttons until the connection is ready
> ## Documentation Index
> Fetch the complete documentation index at: https://documentation.api.odyssey.ml/llms.txt
> Use this file to discover all available pages before exploring further.

# Types & Interfaces

> TypeScript types and interfaces for the Odyssey client.

## Event Handlers

### OdysseyEventHandlers

Event handlers for the Odyssey client class.

```typescript  theme={null}
interface OdysseyEventHandlers {
  onConnected?: (mediaStream: MediaStream) => void;
  onDisconnected?: () => void;
  onStreamStarted?: (streamId: string) => void;
  onStreamEnded?: () => void;
  onInteractAcknowledged?: (prompt: string) => void;
  onStreamError?: (reason: string, message: string) => void;
  onError?: (error: Error, fatal: boolean) => void;
  onStatusChange?: (status: ConnectionStatus, message?: string) => void;
}
```

| Handler                  | Parameters                                   | Description                                                                   |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `onConnected`            | `mediaStream: MediaStream`                   | Called when video stream is established                                       |
| `onDisconnected`         | -                                            | Called when video stream is closed                                            |
| `onStreamStarted`        | `streamId: string`                           | Called when interactive stream is ready (streamId can be used for recordings) |
| `onStreamEnded`          | -                                            | Called when interactive stream has ended                                      |
| `onInteractAcknowledged` | `prompt: string`                             | Called when interaction is processed                                          |
| `onStreamError`          | `reason: string, message: string`            | Called on stream error (e.g., model crash)                                    |
| `onError`                | `error: Error, fatal: boolean`               | Called on general error                                                       |
| `onStatusChange`         | `status: ConnectionStatus, message?: string` | Called when connection status changes                                         |

### UseOdysseyHandlers

Event handlers for the `useOdyssey` React hook. Same interface as `OdysseyEventHandlers`.

```typescript  theme={null}
type UseOdysseyHandlers = OdysseyEventHandlers;
```

### UseOdysseyOptions

Configuration for the `useOdyssey` React hook.

```typescript  theme={null}
interface UseOdysseyOptions {
  /** API key for authentication (required) */
  apiKey: string;
  /** Event handlers (optional) */
  handlers?: UseOdysseyHandlers;
}
```

| Property   | Type                 | Required | Description          |
| ---------- | -------------------- | -------- | -------------------- |
| `apiKey`   | `string`             | Yes      | Your Odyssey API key |
| `handlers` | `UseOdysseyHandlers` | No       | Event handlers       |

## Configuration

### ClientConfig

Configuration for the Odyssey client constructor.

```typescript  theme={null}
interface ClientConfig {
  /** API key for authentication (required) */
  apiKey: string;
}
```

| Property | Type     | Description                |
| -------- | -------- | -------------------------- |
| `apiKey` | `string` | API key for authentication |

## Status Types

### ConnectionStatus

```typescript  theme={null}
type ConnectionStatus =
  | 'authenticating'  // Authenticating with Odyssey API
  | 'connecting'      // Connecting to streaming server
  | 'reconnecting'    // Reconnecting after disconnect
  | 'connected'       // Connected and ready
  | 'disconnected'    // Disconnected (clean)
  | 'failed';         // Connection failed (fatal)
```

## Recording Types

<Info>Recording types were added in v1.0.0</Info>

### Recording

Recording data returned from `getRecording()`.

```typescript  theme={null}
interface Recording {
  stream_id: string;
  video_url: string | null;
  events_url: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  frame_count: number | null;
  duration_seconds: number | null;
}
```

| Property           | Type             | Description                                      |
| ------------------ | ---------------- | ------------------------------------------------ |
| `stream_id`        | `string`         | The stream ID (unique per startStream/endStream) |
| `video_url`        | `string \| null` | Presigned URL for full recording video (MP4)     |
| `events_url`       | `string \| null` | Presigned URL for events log (JSONL)             |
| `thumbnail_url`    | `string \| null` | Presigned URL for thumbnail image (JPEG)         |
| `preview_url`      | `string \| null` | Presigned URL for preview video (MP4)            |
| `frame_count`      | `number \| null` | Total frames in recording                        |
| `duration_seconds` | `number \| null` | Recording duration in seconds                    |

<Note>
  URLs are valid for a limited time (typically 1 hour).
</Note>

### StreamRecordingSummary

Summary of a stream recording returned in `listStreamRecordings()`.

```typescript  theme={null}
interface StreamRecordingSummary {
  stream_id: string;
  width: number;
  height: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}
```

| Property           | Type             | Description                                          |
| ------------------ | ---------------- | ---------------------------------------------------- |
| `stream_id`        | `string`         | Unique stream identifier (per startStream/endStream) |
| `width`            | `number`         | Stream resolution width                              |
| `height`           | `number`         | Stream resolution height                             |
| `started_at`       | `string`         | ISO timestamp when stream started                    |
| `ended_at`         | `string \| null` | ISO timestamp when stream ended                      |
| `duration_seconds` | `number \| null` | Stream duration in seconds                           |

### ListStreamRecordingsOptions

Options for `listStreamRecordings()`.

```typescript  theme={null}
interface ListStreamRecordingsOptions {
  limit?: number;
  offset?: number;
}
```

| Property | Type     | Default | Description                               |
| -------- | -------- | ------- | ----------------------------------------- |
| `limit`  | `number` | `50`    | Maximum recordings to return (max 100)    |
| `offset` | `number` | `0`     | Number of recordings to skip (pagination) |

### StreamRecordingsListResponse

Response from `listStreamRecordings()`.

```typescript  theme={null}
interface StreamRecordingsListResponse {
  recordings: StreamRecordingSummary[];
  total: number;
  limit: number;
  offset: number;
}
```

| Property     | Type                       | Description                         |
| ------------ | -------------------------- | ----------------------------------- |
| `recordings` | `StreamRecordingSummary[]` | Array of stream recording summaries |
| `total`      | `number`                   | Total recordings available          |
| `limit`      | `number`                   | Limit used in request               |
| `offset`     | `number`                   | Offset used in request              |

## Simulate API Types

<Info>Simulate API types were added in v1.0.0</Info>

### SimulationJobStatus

Status of a simulation job.

```typescript  theme={null}
type SimulationJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

| Status      | Description                        |
| ----------- | ---------------------------------- |
| `pending`   | Job is queued and waiting to start |
| `running`   | Job is currently executing         |
| `completed` | Job finished successfully          |
| `failed`    | Job encountered an error           |
| `cancelled` | Job was cancelled by user          |

### ScriptEntry

An entry in a simulation script.

```typescript  theme={null}
interface ScriptEntry {
  timestamp_ms: number;           // When this action occurs (milliseconds from start)
  start?: {                       // Begin a new stream
    prompt: string;
    image?: File | Blob | string; // Optional image for image-to-video
  };
  interact?: {                    // Send an interaction
    prompt: string;
  };
  end?: Record<string, never>;    // End the stream (empty object)
}
```

| Property       | Type                                                 | Description                                       |
| -------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `timestamp_ms` | `number`                                             | When this action occurs (milliseconds from start) |
| `start`        | `{ prompt: string; image?: File \| Blob \| string }` | Begin a new stream with initial prompt            |
| `interact`     | `{ prompt: string }`                                 | Send an interaction prompt                        |
| `end`          | `{}`                                                 | End the current stream (empty object)             |

### SimulateOptions

Options for `simulate()`.

```typescript  theme={null}
interface SimulateOptions {
  script: ScriptEntry[];
  portrait?: boolean;  // true for portrait (704x1280), false for landscape (1280x704)
}
```

| Property   | Type            | Description                        |
| ---------- | --------------- | ---------------------------------- |
| `script`   | `ScriptEntry[]` | Array of script entries to execute |
| `portrait` | `boolean`       | Portrait mode (default: true)      |

### SimulationStream

Information about a stream within a simulation.

```typescript  theme={null}
interface SimulationStream {
  stream_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
}
```

| Property        | Type             | Description              |
| --------------- | ---------------- | ------------------------ |
| `stream_id`     | `string`         | Unique stream identifier |
| `status`        | `string`         | Status of this stream    |
| `error_message` | `string \| null` | Error message if failed  |

### SimulationJob

Response from `simulate()`.

```typescript  theme={null}
interface SimulationJob {
  job_id: string;
  status: SimulationJobStatus;
  priority: string;
  created_at: string;
  estimated_wait_minutes: number | null;
}
```

| Property                 | Type                  | Description                        |
| ------------------------ | --------------------- | ---------------------------------- |
| `job_id`                 | `string`              | Unique identifier for the job      |
| `status`                 | `SimulationJobStatus` | Current job status                 |
| `priority`               | `string`              | Job priority                       |
| `created_at`             | `string`              | ISO timestamp when job was created |
| `estimated_wait_minutes` | `number \| null`      | Estimated wait time in minutes     |

### SimulationJobDetail

Detailed information about a simulation job from `getSimulateStatus()`.

```typescript  theme={null}
interface SimulationJobDetail {
  job_id: string;
  status: SimulationJobStatus;
  priority: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  streams: SimulationStream[];
}
```

| Property        | Type                  | Description                            |
| --------------- | --------------------- | -------------------------------------- |
| `job_id`        | `string`              | Unique identifier for the job          |
| `status`        | `SimulationJobStatus` | Current job status                     |
| `priority`      | `string`              | Job priority                           |
| `created_at`    | `string`              | ISO timestamp when job was created     |
| `started_at`    | `string \| null`      | ISO timestamp when job started running |
| `completed_at`  | `string \| null`      | ISO timestamp when job completed       |
| `error_message` | `string \| null`      | Error message if job failed            |
| `streams`       | `SimulationStream[]`  | Streams created during simulation      |

### SimulationJobInfo

Summary information for a simulation job in a list.

```typescript  theme={null}
interface SimulationJobInfo {
  job_id: string;
  status: SimulationJobStatus;
  priority: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}
```

| Property        | Type                  | Description                        |
| --------------- | --------------------- | ---------------------------------- |
| `job_id`        | `string`              | Unique identifier for the job      |
| `status`        | `SimulationJobStatus` | Current job status                 |
| `priority`      | `string`              | Job priority                       |
| `created_at`    | `string`              | ISO timestamp when job was created |
| `completed_at`  | `string \| null`      | ISO timestamp when job completed   |
| `error_message` | `string \| null`      | Error message if job failed        |

### ListSimulationsOptions

Options for `listSimulations()`.

```typescript  theme={null}
interface ListSimulationsOptions {
  limit?: number;
  offset?: number;
}
```

| Property | Type     | Default | Description                         |
| -------- | -------- | ------- | ----------------------------------- |
| `limit`  | `number` | `50`    | Maximum jobs to return (max 100)    |
| `offset` | `number` | `0`     | Number of jobs to skip (pagination) |

### SimulationJobsList

Response from `listSimulations()`.

```typescript  theme={null}
interface SimulationJobsList {
  jobs: SimulationJobInfo[];
  total: number;
  limit: number;
  offset: number;
}
```

| Property | Type                  | Description                       |
| -------- | --------------------- | --------------------------------- |
| `jobs`   | `SimulationJobInfo[]` | Array of simulation job summaries |
| `total`  | `number`              | Total jobs available              |
| `limit`  | `number`              | Limit used in request             |
| `offset` | `number`              | Offset used in request            |

## Error Handling

### Fatal vs Non-Fatal Errors

The `onError` handler receives a `fatal` boolean parameter:

| Fatal   | Description                | Action Required             |
| ------- | -------------------------- | --------------------------- |
| `true`  | Connection cannot continue | Return user to connect page |
| `false` | Recoverable error          | May retry or notify user    |

### Common Error Messages

| Error                                                 | Description                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `Odyssey: config object is required...`               | Constructor called without a config object                               |
| `Odyssey: apiKey is required and must be a string...` | API key is missing, undefined, or not a string                           |
| `Odyssey: apiKey cannot be empty...`                  | API key is an empty string                                               |
| `Invalid API key`                                     | The provided API key is invalid (401)                                    |
| `Invalid API key format...`                           | API key format is malformed (422)                                        |
| `API key access denied`                               | The API key is valid but access is denied (403, e.g., suspended account) |
| `Maximum concurrent sessions (N) reached`             | Concurrent session quota exceeded (429)                                  |
| `No available sessions`                               | No streamers available, try again later                                  |
| `Streamer not available`                              | Assigned streamer is not responding                                      |
| `Streamer disconnected`                               | Streamer disconnected during session                                     |
| `Timed out waiting for a streamer`                    | Queue timeout expired while waiting for a streamer                       |

## TypeScript Exports

```typescript  theme={null}
// Main entry point (@odysseyml/odyssey)
export { Odyssey } from './odyssey';
export type { OdysseyEventHandlers, ConnectionStatus, ClientConfig, OdysseyClient } from './types';

// React entry point (@odysseyml/odyssey/react)
export { useOdyssey } from './useOdyssey';
export type { UseOdysseyHandlers, OdysseyClient } from './types';
```

## Browser Compatibility

| Browser     | Minimum Version |
| ----------- | --------------- |
| Chrome/Edge | 90+             |
| Firefox     | 88+             |
| Safari      | 14.1+           |

<Note>
  Requires WebRTC support (`RTCPeerConnection`, `RTCDataChannel`)
</Note>
