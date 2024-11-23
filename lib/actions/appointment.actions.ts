'use server'

import { ID, Query } from "node-appwrite";
import { APPOINTMENT_COLLECTION_ID, DATABASE_ID, databases, messaging } from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";
import { Appointment } from "@/types/appwrite.types";
import { revalidatePath } from "next/cache";

export const createAppointment = async (appointment: CreateAppointmentParams) => {
    try {
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    return parseStringify(newAppointment);
    } catch (error) {
        console.log(error)
    }
}

export const getAppointment = async (appointmentId: string) => {
    try {
        const appointment = await databases.getDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointmentId,
          );
          return parseStringify(appointment);
          
    } catch (error) {
        console.log(error)
    }
}

export const getRecentAppointmentList = async () => {
    try {
        const appointment = await databases.listDocuments(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            [ Query.orderDesc('$createdAt') ]
        );

        const initialCounts ={
            scheduledCount: 0,
            pendingCount: 0,
            cancelledCount: 0
        }

        const counts = (appointment.documents as Appointment[]).reduce((acc, appointment) => {
            if (appointment.status === 'scheduled') {
                acc.scheduledCount+= 1;
            } else if (appointment.status === 'pending') {
                acc.pendingCount+= 1;
            } else if (appointment.status === 'cancelled') {
                acc.cancelledCount+= 1;
            }

            return acc;
        }, initialCounts); 

        const data = {
            totalCount : appointment.total,
            ...counts,
            documents: appointment.documents
        }
            
        return parseStringify(data);
    } catch (error) {
        console.log(error)
    }
}

export const updateAppointment = async ({appointmentId, userId, appointment, type}: 
    UpdateAppointmentParams
) => {
    try {
        const updatedAppoointment = await databases.updateDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointmentId,
            appointment
        )

        if (!updatedAppoointment) {
            throw new Error('Appointment not found')
        }

        // TODO SMS notification
        const smsMessage = `
        Hi, it's CarePulse.
        ${type === 'scheduled' ? `Your appointment has been scheduled for ${formatDateTime(appointment.scheduled)}` 
        : `We regret to inform you that your appointment has been cancelled for the reason: ${appointment.cancellationReason}`
        }
        `

        await sendSMSNotification(userId, smsMessage)

        revalidatePath('/admin')
        return parseStringify(updatedAppoointment)
    } catch (error) {
        console.log(error)
    }
}


export const sendSMSNotification = async (userId: string, content: string) => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [],
      [userId]
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending sms:", error);
  }
};
