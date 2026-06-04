import { notFound } from '../errors.js';
import { careUnitRepository } from '../repositories/careUnitRepository.js';
import { medicationRepository } from '../repositories/medicationRepository.js';
import { stockEventRepository } from '../repositories/stockEventRepository.js';

export type ReplenishmentSuggestion = {
  medicationId: string;
  medicationName: string;
  atcCode: string;
  currentStock: number;
  threshold: number;
  averageDailyUsage: number;
  estimatedDaysUntilStockout: number | null;
  recommendedQuantity: number;
  priority: 'critical' | 'soon' | 'stable';
  explanation: string;
};

export const aiService = {
  replenishmentSuggestions(careUnitId: string): ReplenishmentSuggestion[] {
    if (!careUnitRepository.findById(careUnitId)) throw notFound('Vårdenheten finns inte.');

    return medicationRepository.list({ careUnitId }).map((medication) => {
      const usage30Days = stockEventRepository.usageLastDays(careUnitId, medication.id, 30);
      const averageDailyUsage = Number((usage30Days / 30).toFixed(2));
      const estimatedDaysUntilStockout = averageDailyUsage > 0 ? Math.floor(medication.stock / averageDailyUsage) : null;
      const twoWeekNeed = averageDailyUsage > 0 ? Math.ceil(averageDailyUsage * 14) : medication.threshold;
      const recommendedQuantity = Math.max(0, twoWeekNeed + medication.threshold - medication.stock);

      const priority =
        medication.stock < medication.threshold
          ? 'critical'
          : estimatedDaysUntilStockout !== null && estimatedDaysUntilStockout <= 7
            ? 'soon'
            : 'stable';

      const explanation =
        priority === 'critical'
          ? `${medication.name} ligger under miniminivån för vald vårdenhet. Rekommendationen baseras på ${usage30Days} uttag senaste 30 dagarna.`
          : priority === 'soon'
            ? `${medication.name} kan nå kritisk nivå inom ungefär en vecka om förbrukningen fortsätter.`
            : `${medication.name} ser stabilt ut just nu, men historisk förbrukning följs fortsatt.`;

      return {
        medicationId: medication.id,
        medicationName: medication.name,
        atcCode: medication.atcCode,
        currentStock: medication.stock,
        threshold: medication.threshold,
        averageDailyUsage,
        estimatedDaysUntilStockout,
        recommendedQuantity,
        priority,
        explanation
      };
    });
  }
};
