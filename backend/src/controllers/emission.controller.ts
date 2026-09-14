import { Request, Response } from 'express';
import { pool } from '../config/database';
import { CreateEmissionRequest, UpdateEmissionRequest } from '../types/emission.types';

const EMISSION_FACTOR = 0.82;

export const createEmission = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userContext = req.userContext;
  
      if (!userContext) {
        res.status(401).json({
          success: false,
          message: 'User context is missing.',
        });
        return;
      }
  
      // Only Clients can create emission records
      if (userContext.role !== 'Client') {
        res.status(403).json({
          success: false,
          message: 'Only Clients can create emission records.',
        });
        return;
      }
  
      const {
        month,
        electricityConsumption,
      } = req.body as CreateEmissionRequest;
  
      if (!month || electricityConsumption === undefined) {
        res.status(400).json({
          success: false,
          message:
            'Month and electricity consumption are required.',
        });
        return;
      }
  
      if (electricityConsumption <= 0) {
        res.status(400).json({
          success: false,
          message: 'Electricity consumption must be greater than 0.',
        });
        return;
      }
  
      // IMPORTANT:
      // Organization comes from the backend user context.
      // We do NOT trust organizationId from the request body.
      const organizationId = userContext.organizationId!;
  
      const organizationResult = await pool.query(
        'SELECT id, name FROM organizations WHERE id = $1',
        [organizationId]
      );
  
      if (organizationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Organization not found.',
        });
        return;
      }
  
      const co2Emission =
        electricityConsumption * EMISSION_FACTOR;
  
      const result = await pool.query(
        `
        INSERT INTO emission_records
          (
            organization_id,
            month,
            electricity_consumption,
            emission_factor,
            co2_emission,
            status
          )
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          organization_id,
          TO_CHAR(month, 'YYYY-MM-DD') AS month,
          electricity_consumption,
          emission_factor,
          co2_emission,
          created_date,
          status
        `,
        [
          organizationId,
          month,
          electricityConsumption,
          EMISSION_FACTOR,
          co2Emission,
          'Pending',
        ]
      );
  
      const record = result.rows[0];
  
      res.status(201).json({
        success: true,
        message: 'Emission record created successfully.',
        data: {
          id: record.id,
          organizationId: record.organization_id,
          organizationName: organizationResult.rows[0].name,
          month: record.month,
          electricityConsumption: Number(
            record.electricity_consumption
          ),
          emissionFactor: Number(record.emission_factor),
          co2Emission: Number(record.co2_emission),
          createdDate: record.created_date,
          status: record.status,
        },
      });
    } catch (error) {
      console.error('Error creating emission record:', error);
  
      res.status(500).json({
        success: false,
        message: 'Failed to create emission record.',
      });
    }
  };

export const getEmissions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userContext = req.userContext;
  
      if (!userContext) {
        res.status(401).json({
          success: false,
          message: 'User context is missing.',
        });
        return;
      }
  
      const organizationIdParam = req.query.organizationId;
  
      let query = `
        SELECT
          er.id,
          er.organization_id,
          o.name AS organization_name,
          TO_CHAR(er.month, 'YYYY-MM-DD') AS month,
          er.electricity_consumption,
          er.emission_factor,
          er.co2_emission,
          er.created_date,
          er.status
        FROM emission_records er
        INNER JOIN organizations o
          ON er.organization_id = o.id
      `;
  
      const queryParams: number[] = [];
  
      /*
       * CLIENT:
       * Always use the organization ID from the backend user context.
       * Never trust organizationId from the query string.
       */
      if (userContext.role === 'Client') {
        query += ' WHERE er.organization_id = $1';
        queryParams.push(userContext.organizationId!);
      }
  
      /*
       * ADMIN:
       * Admin can optionally filter by organization ID.
       */
      if (userContext.role === 'Admin' && organizationIdParam !== undefined) {
        const organizationId = Number(organizationIdParam);
  
        if (!Number.isInteger(organizationId) || organizationId <= 0) {
          res.status(400).json({
            success: false,
            message: 'Invalid organization ID.',
          });
          return;
        }
  
        query += ' WHERE er.organization_id = $1';
        queryParams.push(organizationId);
      }
  
      query += ' ORDER BY er.month DESC, er.id DESC';
  
      const result = await pool.query(query, queryParams);
  
      const records = result.rows.map((record) => ({
        id: record.id,
        organizationId: record.organization_id,
        organizationName: record.organization_name,
        month: record.month,
        electricityConsumption: Number(record.electricity_consumption),
        emissionFactor: Number(record.emission_factor),
        co2Emission: Number(record.co2_emission),
        createdDate: record.created_date,
        status: record.status,
      }));
  
      res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      console.error('Error fetching emission records:', error);
  
      res.status(500).json({
        success: false,
        message: 'Failed to fetch emission records.',
      });
    }
  };

  export const updateEmission = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userContext = req.userContext;
  
      if (!userContext) {
        res.status(401).json({
          success: false,
          message: 'User context is missing.',
        });
        return;
      }
  
      const id = Number(req.params.id);
  
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid emission record ID.',
        });
        return;
      }
  
      const {
        month,
        electricityConsumption,
      } = req.body as UpdateEmissionRequest;
  
      if (
        month === undefined &&
        electricityConsumption === undefined
      ) {
        res.status(400).json({
          success: false,
          message: 'At least one field is required for update.',
        });
        return;
      }
  
      if (
        electricityConsumption !== undefined &&
        electricityConsumption <= 0
      ) {
        res.status(400).json({
          success: false,
          message: 'Electricity consumption must be greater than 0.',
        });
        return;
      }
  
      const existingResult = await pool.query(
        `
        SELECT
          er.id,
          er.organization_id,
          er.month,
          er.electricity_consumption,
          o.name AS organization_name
        FROM emission_records er
        INNER JOIN organizations o
          ON er.organization_id = o.id
        WHERE er.id = $1
        `,
        [id]
      );
  
      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Emission record not found.',
        });
        return;
      }
  
      const existingRecord = existingResult.rows[0];
  
      // Client can update only records belonging to their organization
      if (
        userContext.role === 'Client' &&
        existingRecord.organization_id !== userContext.organizationId
      ) {
        res.status(403).json({
          success: false,
          message: 'You cannot update records from another organization.',
        });
        return;
      }
  
      const updatedMonth =
        month ?? existingRecord.month;
  
      const updatedConsumption =
        electricityConsumption ??
        Number(existingRecord.electricity_consumption);
  
      const co2Emission =
        updatedConsumption * EMISSION_FACTOR;
  
      const result = await pool.query(
        `
        UPDATE emission_records
        SET
          month = $1,
          electricity_consumption = $2,
          emission_factor = $3,
          co2_emission = $4,
          status = 'Pending'
        WHERE id = $5
        RETURNING
          id,
          organization_id,
          TO_CHAR(month, 'YYYY-MM-DD') AS month,
          electricity_consumption,
          emission_factor,
          co2_emission,
          created_date,
          status
        `,
        [
          updatedMonth,
          updatedConsumption,
          EMISSION_FACTOR,
          co2Emission,
          id,
        ]
      );
  
      const record = result.rows[0];
  
      res.status(200).json({
        success: true,
        message: 'Emission record updated successfully.',
        data: {
          id: record.id,
          organizationId: record.organization_id,
          organizationName: existingRecord.organization_name,
          month: record.month,
          electricityConsumption: Number(
            record.electricity_consumption
          ),
          emissionFactor: Number(record.emission_factor),
          co2Emission: Number(record.co2_emission),
          createdDate: record.created_date,
          status: record.status,
        },
      });
    } catch (error) {
      console.error('Error updating emission record:', error);
  
      res.status(500).json({
        success: false,
        message: 'Failed to update emission record.',
      });
    }
  };


  export const deleteEmission = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userContext = req.userContext;
  
      if (!userContext) {
        res.status(401).json({
          success: false,
          message: 'User context is missing.',
        });
        return;
      }

      if (userContext.role !== 'Client') {
        res.status(403).json({
          success: false,
          message: 'Only Client users can update emission records.',
        });
        return;
      }
  
      // Only Clients can delete emission records
      if (userContext.role !== 'Client') {
        res.status(403).json({
          success: false,
          message: 'Only Clients can delete emission records.',
        });
        return;
      }
  
      const id = Number(req.params.id);
  
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid emission record ID.',
        });
        return;
      }
  
      // First find the record and its organization
      const existingResult = await pool.query(
        `
        SELECT id, organization_id
        FROM emission_records
        WHERE id = $1
        `,
        [id]
      );
  
      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Emission record not found.',
        });
        return;
      }
  
      const existingRecord = existingResult.rows[0];
  
      // Client can delete only records belonging to their organization
      if (
        existingRecord.organization_id !== userContext.organizationId
      ) {
        res.status(403).json({
          success: false,
          message:
            'You cannot delete records from another organization.',
        });
        return;
      }
  
      await pool.query(
        `
        DELETE FROM emission_records
        WHERE id = $1
        `,
        [id]
      );
  
      res.status(200).json({
        success: true,
        message: 'Emission record deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting emission record:', error);
  
      res.status(500).json({
        success: false,
        message: 'Failed to delete emission record.',
      });
    }
  };


  export const updateEmissionStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
        const userContext = req.userContext;

        if (!userContext) {
          res.status(401).json({
            success: false,
            message: 'User context is missing.',
          });
          return;
        }
    
        if (userContext.role !== 'Admin') {
          res.status(403).json({
            success: false,
            message: 'Only Admins can validate or reject emission records.',
          });
          return;
        }
      const id = Number(req.params.id);
      const { status } = req.body as {
        status: 'Validated' | 'Rejected';
      };
  
      // Validate record ID
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid emission record ID.',
        });
        return;
      }

      if (userContext.role !== 'Admin') {
        res.status(403).json({
          success: false,
          message: 'Only Admins can validate or reject emission records.',
        });
        return;
      }
  
      // Validate status
      if (status !== 'Validated' && status !== 'Rejected') {
        res.status(400).json({
          success: false,
          message: 'Status must be either Validated or Rejected.',
        });
        return;
      }
  
      // Check whether record exists
      const existingResult = await pool.query(
        `
        SELECT id
        FROM emission_records
        WHERE id = $1
        `,
        [id]
      );
  
      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Emission record not found.',
        });
        return;
      }
  
      // Update status
      const result = await pool.query(
        `
        UPDATE emission_records
        SET status = $1
        WHERE id = $2
        RETURNING
          id,
          organization_id,
          TO_CHAR(month, 'YYYY-MM-DD') AS month,
          electricity_consumption,
          emission_factor,
          co2_emission,
          created_date,
          status
        `,
        [status, id]
      );
  
      const record = result.rows[0];
  
      // Get organization name
      const organizationResult = await pool.query(
        `
        SELECT name
        FROM organizations
        WHERE id = $1
        `,
        [record.organization_id]
      );
  
      res.status(200).json({
        success: true,
        message: `Emission record ${status.toLowerCase()} successfully.`,
        data: {
          id: record.id,
          organizationId: record.organization_id,
          organizationName: organizationResult.rows[0].name,
          month: record.month,
          electricityConsumption: Number(
            record.electricity_consumption
          ),
          emissionFactor: Number(record.emission_factor),
          co2Emission: Number(record.co2_emission),
          createdDate: record.created_date,
          status: record.status,
        },
      });
    } catch (error) {
      console.error('Error updating emission status:', error);
  
      res.status(500).json({
        success: false,
        message: 'Failed to update emission status.',
      });
    }
  };


  export const getEmissionTotals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userContext = req.userContext;

    if (!userContext) {
      res.status(401).json({
        success: false,
        message: 'User context is missing.',
      });
      return;
    }

    let organizationId: number;

    if (userContext.role === 'Client') {
      // Client can only access their own organization's totals.
      organizationId = userContext.organizationId!;
    } else {
      // Admin can optionally specify an organization.
      const organizationIdParam = req.query.organizationId;

      if (organizationIdParam === undefined) {
        res.status(400).json({
          success: false,
          message: 'Organization ID is required for Admin.',
        });
        return;
      }

      organizationId = Number(organizationIdParam);

      if (!Number.isInteger(organizationId) || organizationId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid organization ID.',
        });
        return;
      }
    }

    const organizationResult = await pool.query(
      `
      SELECT id, name
      FROM organizations
      WHERE id = $1
      `,
      [organizationId]
    );

    if (organizationResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Organization not found.',
      });
      return;
    }

    const result = await pool.query(
      `
      SELECT
        COALESCE(SUM(electricity_consumption), 0)
          AS total_electricity_consumption,
        COALESCE(SUM(co2_emission), 0)
          AS total_co2_emission
      FROM emission_records
      WHERE organization_id = $1
        AND status = 'Validated'
      `,
      [organizationId]
    );

    const totals = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        organizationId,
        organizationName: organizationResult.rows[0].name,
        totalElectricityConsumption: Number(
          totals.total_electricity_consumption
        ),
        totalCo2Emission: Number(
          totals.total_co2_emission
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching emission totals:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch emission totals.',
    });
  }
};