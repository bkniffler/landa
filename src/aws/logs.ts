import { CloudWatchLogs, SharedIniFileCredentials, config } from 'aws-sdk';
import chalk from 'chalk';

const credentials = new SharedIniFileCredentials({
  profile: process.env.AWS_PROFILE,
});
config.credentials = credentials;
config.update({ region: process.env.AWS_REGION });
const cloudwatch = new CloudWatchLogs();

export async function log(args: { group: string }) {
  const logGroupName = args.group;
  let nextToken = undefined;
  let lastLogStreamName = undefined;
  while (true) {
    // const spinner = ora().start();
    const { logStreamName } = await cloudwatch
      .describeLogStreams({
        logGroupName,
        orderBy: 'LastEventTime',
        limit: 1,
        descending: true,
      })
      .promise()
      .then(({ logStreams }) => logStreams[0]);
    if (lastLogStreamName !== logStreamName) {
      nextToken = undefined;
      lastLogStreamName = logStreamName;
    }
    const { events } = await cloudwatch
      .getLogEvents({
        logGroupName,
        logStreamName,
        startFromHead: false,
        limit: 20,
        nextToken,
      })
      .promise();
    // spinner.stop();
    events.forEach(({ message, timestamp }) => {
      if (message && message.trim()) {
        console.log(
          `[${chalk.blue(new Date(timestamp).toISOString())}] ${message.trim()}`
        );
      }
    });
    await new Promise((yay) => setTimeout(yay, 2000));
  }
}
