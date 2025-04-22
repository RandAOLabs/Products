# Sweepstakes Application

A modular sweepstakes application that allows users to enter a list of names, register with payment, and randomly pull winners.

## Features

- **Entrants Management**: Add, edit, and update a list of potential winners
- **Payment Integration**: Register with payment to unlock pulling functionality
- **Winner Selection**: Randomly select winners from the entrants list
- **Pull History**: View a history of all past pulls and their winners
- **Payment Status**: Track whether the user has registered with payment

## Application Structure

The application follows a modular architecture to promote maintainability and scalability:

### Components

- **EntrantsForm**: Manages the list of entrants with text input and updates
- **SweepstakesControls**: Handles registration, payment, and winner selection
- **PullsHistory**: Displays past pulls and their results
- **Sweepstakes**: Main component that orchestrates the application flow

### Context

- **SweepstakesContext**: Provides state management and client operations across components

## Technical Details

The application uses:

- React for the UI components
- Context API for state management
- ao-process-clients for interacting with the sweepstakes blockchain process
- A responsive design that works well on desktop and mobile devices

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

4. Deploy to the permaweb:
   ```
   npm run deploy
   ```

## Extending the Application

The modular design makes it easy to extend the application:

1. Add new components in the `src/components/Sweepstakes/` directory
2. Expand context functionality in `src/context/SweepstakesContext.tsx`
3. Modify styles in the respective CSS files

## License

See the LICENSE file for details.
