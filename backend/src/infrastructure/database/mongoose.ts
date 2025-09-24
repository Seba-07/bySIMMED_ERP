import mongoose from 'mongoose';

export const connectDatabase = async (primaryUri: string): Promise<void> => {
  const fallbackUri = 'mongodb://localhost:27017/bysimmed_erp';

  // En desarrollo, permitir buffering si no hay conexión
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('bufferCommands', true);
  } else {
    mongoose.set('bufferCommands', false);
  }

  // Intentar MongoDB Atlas primero
  try {
    console.log('🔄 Intentando conexión a MongoDB Atlas...');
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 30000, // 30 segundos
      connectTimeoutMS: 30000, // 30 segundos
      socketTimeoutMS: 45000, // 45 segundos
      heartbeatFrequencyMS: 10000, // 10 segundos
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    console.log('✅ Conectado a MongoDB Atlas exitosamente');
    return;
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB Atlas:', (error as Error).message);

    // Intentar MongoDB local como respaldo
    try {
      console.log('🔄 Intentando conexión a MongoDB local...');
      await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 10000, // 10 segundos
        connectTimeoutMS: 10000, // 10 segundos
        socketTimeoutMS: 30000, // 30 segundos
        heartbeatFrequencyMS: 5000, // 5 segundos
        maxPoolSize: 5,
        minPoolSize: 2,
      });
      console.log('✅ Conectado a MongoDB local exitosamente');
      return;
    } catch (localError) {
      console.error('❌ Error de conexión a MongoDB local:', (localError as Error).message);

      // En desarrollo, permitir continuar sin MongoDB
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  WARNING: Continuando sin MongoDB en modo desarrollo');
        console.warn('⚠️  La aplicación funcionará con limitaciones');
        console.warn('⚠️  Para funcionalidad completa, instale MongoDB local o arregle la conectividad');
        return;
      }

      process.exit(1);
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};