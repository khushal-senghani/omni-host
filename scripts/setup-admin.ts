#!/usr/bin/env tsx
import { connectDB, User } from '@pap/core';
import { hashPassword } from '@pap/auth';
import readline from 'readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function setupAdmin() {
    await connectDB();
    console.log('👤 Create admin user\n');

    const email = await rl.question('Email: ');
    const password = await rl.question('Password: ');

    const passwordHash = await hashPassword(password);

    await User.create({
        email,
        passwordHash,
        role: 'owner',
    });

    console.log('✅ Admin user created');
    process.exit(0);
}

setupAdmin();